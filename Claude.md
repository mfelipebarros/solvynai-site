# SolvynAI

## About
SolvynAI is an AI, automation and development agency based in Brazil. We create smart solutions for companies, delivering end-to-end solutions including:
- Agentic chat systems
- Websites
- Mobile applications
- CRM systems
- Internal control tools
- And more custom solutions

## Our Process
We work based on 3 main steps:

1. **Discovery** - Understanding your needs and requirements
2. **Development** - Building your solution
3. **Delivery** - Optimization and continuation of development (not just delivery)

## Design System & Styling Guide

### Colors
- **Background**: #030303 (Dark black)
- **Primary White**: #FCFBFC
- **Secondary Grey**: #DEDEDE
- **Accent Orange**: #FF310C
- **Gradient Colors**:
  - Yellow: #FFD857
  - Orange: #FF310C
  - Dark Red: #3A0F08

### Typography
- **Primary Font**: Nohemi Regular
  - Used for: Large headings, hero text
  - Font file: `Nohemi-Regular.otf`

- **Secondary Font**: Raleway (Variable)
  - Used for: Body text, navigation, buttons
  - Weights: 400 (Regular), 500 (Medium)
  - Font files: `Raleway-Variable.ttf`, `Raleway-Italic-Variable.ttf`

### Buttons
- **Style**: Skewed at -15deg with counter-skewed text (15deg)
- **Border Radius**: 0 (sharp corners)
- **Padding**: 12px 24px
- **Font**: Raleway Regular, 16px
- **Hover Effect**: Sliding fill animation from left to right

**Button Types**:
- **Primary**: Orange background (#FF310C) → White on hover
- **Secondary**: Grey background (#DEDEDE) → White on hover

### Components

#### Navigation
- **Position**: Absolute, top of page
- **Font**: Raleway Medium, 16px
- **Colors**: #DEDEDE default, #FCFBFC on hover
- **Hover Effect**: Animated underline from left to right
- **Mobile**: Logo (max-width: 100px) + Language selector only

#### Hero Section
- **Height**: 100dvh
- **Large Text**: "SOLVYN" at 20vw with gradient fade (top to bottom)
- **Background Image**: Pensive entrepreneur, 15% opacity, desaturated, gradient mask
- **Gradient Glow**: Radial gradient at bottom (yellow → orange → dark red → transparent)
- **Content Width**: 650px (desktop), 100% (mobile)

#### Containers
- **White Containers**: #FCFBFC background, 50px border-radius
- **Standard Width**: 660px with max-width: 100%

### Animations (GSAP)
- **Nav**: Fade in from top (-50px), 1s duration, 0.2s delay
- **Hero Elements**: Sequential animation with 0.15s stagger
  - H1 → P → Primary Button → Secondary Button
- **Large Text**: Letter-by-letter animation from bottom (100px), 0.05s stagger

### Responsive Breakpoints
- **Mobile**: max-width: 768px
  - Reduced font sizes (H1: 26px, P: 16px)
  - Hidden secondary button
  - Reduced padding (20-30px)
  - Gradient width: 500%

### Language Support
- English (default)
- Portuguese BR
- URL parameter: `?lang=pt` or `?lang=en`

