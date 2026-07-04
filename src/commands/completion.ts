// `oriro completion <bash|zsh|fish|pwsh>` — emit a shell tab-completion script (UX-1, 2026-07-04).
// The #1 discoverability gap vs mature CLIs (cli-microsoft365 ships this). The script is GENERATED FROM
// the live commander tree (introspection), so it stays correct as commands change — no hardcoded lists.
// Static output (fast: no per-tab node spawn). Install lines are printed to stderr so `eval`/redirect
// of stdout stays clean.
import type { Command } from "commander";
import { die } from "./ui.js";

interface CmdNode { name: string; subs: string[]; opts: string[]; }

/** Walk the commander tree → top-level commands, their subcommands, and long option flags. */
function extractTree(program: Command): CmdNode[] {
  const nodes: CmdNode[] = [];
  for (const c of program.commands) {
    const name = c.name();
    if (name === "completion") continue; // don't complete the completion command itself
    nodes.push({
      name,
      subs: c.commands.map((s) => s.name()),
      opts: c.options.map((o) => o.long).filter((l): l is string => Boolean(l)),
    });
  }
  return nodes;
}

const SHELLS = ["bash", "zsh", "fish", "pwsh"] as const;
type Shell = (typeof SHELLS)[number];

function topNames(tree: CmdNode[]): string {
  return [...tree.map((n) => n.name), "completion", "help"].join(" ");
}

function genBash(tree: CmdNode[]): string {
  const cases = tree
    .map((n) => `    ${n.name}) COMPREPLY=( $(compgen -W "${n.subs.join(" ")} ${n.opts.join(" ")}" -- "$cur") );;`)
    .join("\n");
  return `# ORIRO bash completion.  Install:  oriro completion bash > /etc/bash_completion.d/oriro
#            or (per-user):  oriro completion bash >> ~/.bashrc
_oriro_complete() {
  local cur prev cword
  cur="\${COMP_WORDS[COMP_CWORD]}"
  cword=$COMP_CWORD
  if [ "$cword" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${topNames(tree)}" -- "$cur") )
    return
  fi
  case "\${COMP_WORDS[1]}" in
${cases}
    *) COMPREPLY=();;
  esac
}
complete -F _oriro_complete oriro
`;
}

function genZsh(tree: CmdNode[]): string {
  const cases = tree
    .map((n) => `    ${n.name}) compadd ${n.subs.join(" ")} ${n.opts.join(" ")} ;;`)
    .join("\n");
  return `#compdef oriro
# ORIRO zsh completion.  Install:  oriro completion zsh > "\${fpath[1]}/_oriro"  (then restart the shell)
_oriro() {
  local -a words; words=("\${(@)words}")
  if (( CURRENT == 2 )); then
    compadd ${topNames(tree)}
    return
  fi
  case "\${words[2]}" in
${cases}
  esac
}
_oriro "$@"
`;
}

function genFish(tree: CmdNode[]): string {
  const lines: string[] = [
    "# ORIRO fish completion.  Install:  oriro completion fish > ~/.config/fish/completions/oriro.fish",
    `complete -c oriro -f -n __fish_use_subcommand -a "${topNames(tree)}"`,
  ];
  for (const n of tree) {
    if (n.subs.length) {
      lines.push(`complete -c oriro -f -n "__fish_seen_subcommand_from ${n.name}" -a "${n.subs.join(" ")}"`);
    }
  }
  return lines.join("\n") + "\n";
}

function genPwsh(tree: CmdNode[]): string {
  const cases = tree
    .map((n) => `        '${n.name}' { @(${[...n.subs, ...n.opts].map((s) => `'${s}'`).join(", ")}) }`)
    .join("\n");
  const top = [...tree.map((n) => n.name), "completion", "help"].map((s) => `'${s}'`).join(", ");
  return `# ORIRO PowerShell completion.  Install:  oriro completion pwsh >> $PROFILE   (then restart pwsh)
Register-ArgumentCompleter -Native -CommandName oriro -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)
    $tokens = $commandAst.CommandElements | ForEach-Object { $_.ToString() }
    $candidates = if ($tokens.Count -le 2) {
        @(${top})
    } else {
        switch ($tokens[1]) {
${cases}
            default { @() }
        }
    }
    $candidates | Where-Object { $_ -like "$wordToComplete*" } |
        ForEach-Object { [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $_) }
}
`;
}

const GENERATORS: Record<Shell, (t: CmdNode[]) => string> = {
  bash: genBash, zsh: genZsh, fish: genFish, pwsh: genPwsh,
};

export function registerCompletionCommand(program: Command): void {
  program
    .command("completion <shell>")
    .description("print a shell tab-completion script (bash | zsh | fish | pwsh)")
    .action((shell: string) => {
      const s = shell.toLowerCase() as Shell;
      if (!SHELLS.includes(s)) {
        die(`unsupported shell '${shell}'. Use one of: ${SHELLS.join(", ")}`);
        return;
      }
      // Script → stdout (so it can be redirected/eval'd); the install hint is inside the script header.
      process.stdout.write(GENERATORS[s](extractTree(program)));
    });
}
