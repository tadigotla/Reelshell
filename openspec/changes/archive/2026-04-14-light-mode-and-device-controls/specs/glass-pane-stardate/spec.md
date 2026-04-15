## REMOVED Requirements

### Requirement: Clock column shows a `LOCAL` label above the time
**Reason**: User feedback — the `LOCAL` label adds no information (the HH:MM:SS format already reads as a clock) and consumed vertical space inside the glass pane that's better spent on a larger clock. Removing it lets the clock font grow from 22px to 28px without expanding the panel.
**Migration**: Delete the `.stardate-label` element from the markup, drop the `.stardate-label` CSS rule, and update the `.stardate-clock` font-size accordingly. No JavaScript or external API changes.
