#!/data/data/com.termux/files/usr/bin/bash
# Oriro OAuth Sync Widget
# Syncs Claude Code tokens to Oriro over SSH
# Place in ~/.shortcuts/ on phone for Termux:Widget

termux-toast "Syncing ORIRO auth..."

# Run sync on the configured Oriro host.
SERVER="${ORIRO_SERVER:-oriro-host}"
RESULT=$(ssh "$SERVER" '$HOME/oriro/scripts/sync-claude-code-auth.sh' 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    # Extract expiry time from output
    EXPIRY=$(echo "$RESULT" | grep "Token expires:" | cut -d: -f2-)

    termux-vibrate -d 100
    termux-toast "ORIRO synced! Expires:${EXPIRY}"

    # Optional: restart oriro service
    ssh "$SERVER" 'systemctl --user restart oriro' 2>/dev/null
else
    termux-vibrate -d 300
    termux-toast "Sync failed: ${RESULT}"
fi
