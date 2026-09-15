# AI Skill: Liquid Glass & Glassmorphism Implementation

## Context
Use these guidelines whenever requested to implement "Liquid Glass" or "Glassmorphism" UI effects in HTML and CSS. 

## General Prerequisites
- **Backgrounds:** Always ensure the glass element is placed over a background image or a gradient, rather than a plain solid color, so the blur and refraction effects are actually visible.

## Technique 1: Standard Glassmorphism (Basic Liquid Glass)
Use this technique for standard frosted glass interfaces using purely CSS.
- **Backdrop Blur:** Use the `backdrop-filter: blur()` property (e.g., `16px`) to blur the content rendered behind the container.
- **Background Color:** Apply a very low-opacity background color, such as white or dark slate with a `0.25` - `0.65` alpha value.
- **Lighting & Borders:** Add a slightly transparent 1px white border. To simulate a directional light source, apply this border only to the top and left edges (`border-top`, `border-left`). 
- **Liquid Edges & Shadows:** To create liquid-like white edges, add an `inset` `box-shadow` that matches the border color so the shadow goes inward (`inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)`). Any outer `box-shadow` applied to the container should be subtle, as glass does not cast strong solid shadows.

## Technique 2: Advanced Liquid Glass (Refraction Effect)
Use this technique when the effect specifically requires the dynamic bending and refracting of backdrop shapes. This requires combining CSS with an SVG filter.
- **CSS Filters:** Apply a `filter` property to the target component that includes a slight increase in `brightness`, an optional `blur`, and a `url(#filter-id)` pointing to a custom SVG displacement filter.
- **SVG Filter Setup:** Create an inline SVG containing an `<feDisplacementMap>` to add depth and texture to the elements. 
- **Displacement Source:** Feed the displacement map either an `<feTurbulence>` element to generate a liquid or ice-like texture, or use a base64 Data URI of a 2D gradient PNG image.
- **Color Channels:** If using a custom image, ensure it supports RGB channels (like PNG) and utilizes the Red and Green channels. Configure the displacement map by setting the `in` attribute to `SourceGraphic`, the `xChannelSelector` to `R`, and the `yChannelSelector` to `G`.
    
## Technical Limitations to Remember
- Pure CSS and SVG cannot achieve complex chromatic aberration, advanced dynamic shadows, or complex real-time light behaviors. 
- If these advanced physical lighting behaviors are required, you must utilize shader-based solutions and JavaScript.
