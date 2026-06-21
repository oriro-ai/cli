/**
 * Help examples shown by the Browser CLI root command.
 */
/** Core Browser CLI examples for lifecycle and inspection commands. */
export const browserCoreExamples = [
  "oriro browser status",
  "oriro browser start",
  "oriro browser start --headless",
  "oriro browser stop",
  "oriro browser tabs",
  "oriro browser open https://example.com",
  "oriro browser focus abcd1234",
  "oriro browser close abcd1234",
  "oriro browser screenshot",
  "oriro browser screenshot --full-page",
  "oriro browser screenshot --ref 12",
  "oriro browser snapshot",
  "oriro browser snapshot --format aria --limit 200",
  "oriro browser snapshot --efficient",
  "oriro browser snapshot --labels",
];

/** Browser CLI examples for interaction/action commands. */
export const browserActionExamples = [
  "oriro browser navigate https://example.com",
  "oriro browser resize 1280 720",
  "oriro browser click 12 --double",
  "oriro browser click-coords 120 340",
  'oriro browser type 23 "hello" --submit',
  "oriro browser press Enter",
  "oriro browser hover 44",
  "oriro browser drag 10 11",
  "oriro browser select 9 OptionA OptionB",
  "oriro browser upload /tmp/oriro/uploads/file.pdf",
  "oriro browser upload media://inbound/file.pdf",
  'oriro browser fill --fields \'[{"ref":"1","value":"Ada"}]\'',
  "oriro browser dialog --accept",
  'oriro browser wait --text "Done"',
  "oriro browser evaluate --fn '(el) => el.textContent' --ref 7",
  "oriro browser evaluate --fn 'const title = document.title; return title;'",
  "oriro browser console --level error",
  "oriro browser pdf",
];
