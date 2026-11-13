# T14 Dashboard Visual Polish Design

## Intent

Elevate the existing T14 dashboard from a functional class-project interface into a credible municipal operations dashboard without changing its routes, data, copy contracts, or read-only behavior.

## Goals

- Create a clear professional hierarchy with a dark civic header, compact navigation, and restrained accent colors.
- Make Resident and Service Request metrics easier to scan through icons, tonal cards, and consistent spacing.
- Present recent activity in a polished operational table with clear status badges and actions.
- Preserve accessibility, mobile responsiveness, existing metric hooks, and all T01–T14 behavior.

## Non-goals

No charts, JavaScript interactions, external design libraries, web fonts, data changes, new routes, or dashboard mutations.

## Approaches

1. **Refined civic admin shell (selected):** use semantic EJS markup and project-local CSS to create a navy/blue municipal dashboard. This gives the strongest professional result without dependencies.
2. **CSS-only reskin:** smallest change, but the current markup limits hierarchy and visual cues.
3. **UI framework adoption:** faster access to components, but adds unnecessary dependencies and risks changing established pages.

## Design

The dashboard uses a dark top bar containing the product identity and primary navigation. A compact welcome block establishes context and read-only status. Resident metrics use three evenly weighted cards; request metrics use a larger total/open pair followed by four status cards. Metric cards include lightweight inline SVG icons, color-coded accent bars, and subdued labels. Recent activity sits in a white elevated panel with a quieter table header, hover affordance, monospace identifiers, and pill statuses. At narrow widths, navigation wraps, cards collapse naturally, and the table remains horizontally scrollable.

## Constraints

- Preserve all existing text that automated tests and course requirements rely on.
- Preserve every `data-metric` attribute and existing route.
- Keep inline SVG decorative with `aria-hidden="true"`.
- Use no network assets or new packages.
