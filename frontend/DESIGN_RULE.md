Design system rules:
- Dark Theme Surfaces: #0E0E10 (base), #1B1B1D (sidebar/nav), #201F21 (cards/main content)
- Light Theme Surfaces: #FCF8FB (base), #F6F3F5 (sidebar/nav), #F0EDF0 (cards/main content)
- No 1px divider lines. Separate sections using background 
  color shifts only.
- No pure white. Use #E5E1E4 for primary text, zinc-400 
  equivalent for secondary.
- Accent (Dark): #7C5CFC violet. CTA gradient: #CABEFF to #947DFF at 145deg.
- Accent (Light): #5F3ADD violet. CTA gradient: #7857F8 to #5F3ADD at 145deg.
- Unread ping: 6px solid #F95B4E dot, no text inside.
- Task IDs, timestamps, commit hashes: Geist Mono.
- All other text: Geist. Body size 0.875rem.
- Border radius: 0.375rem (md) max. No large rounded corners.
- Icons: lucide-react, 1.5px stroke, never filled.
- Floating elements (modals, popovers): surface_bright at 70% 
  opacity, backdrop-blur-xl (20px).
- Cards: no drop shadows. Use Ghost Border — outline_variant 
  #484555 at 15% opacity only when card sits on same-color bg.
- Strict 4px spacing grid throughout.