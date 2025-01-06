# 🖱️ Custom Animated Cursor Plugin

## **Usage**
1 ) Add this code line to your head tag inside html file


    <script defer="defer" src="CursorEffect.js"></script>
 
2 ) Initialize script
    
	const effect = new CursorEffect();
    
    effect.init();

# Options
You can provide options inside `init()` method.

**Example**
------------

    const effect = new CursorEffect();
    
    effect.init({
      toCollide: [
        ...Array.from(document.querySelectorAll(".example-anything")),
        ...Array.from(document.querySelectorAll(".example-anything2")),
      ],
      outerDot: {
        delay: 30,
      },
      innerDot: {
        delay: 0,
      },
    });

#Options API
| Key |  Type | Description
| ------------ | ------------ |
| toCollide  |  HTMLElement[] | Array of DOM elements for interact with cursor
| innerDot  | Object  | To customize inner dot of cursor effect
| innerDot.width  | number  | For change inner cursor width
| innerDot.height  | number  | For change inner cursor height
| innerDot.largeWidth  | number  | If you provide `toCollide` option to `init()` method then cursor width will change when you hovered one of provided `toCollide` elements
| innerDot.largeHeight  | number  | If you provide `toCollide` option to `init()` method then cursor height will change when you hovered one of provided `toCollide` elements
| innerDot.delay  | number  | Cursor position change animation delay
| innerDot.resizeDuration  | number  | When cursor width and height changeing this option will add duration to animation
| innerDot.styles  | Partial< CSSStyleDeclaration >  | change styles of inner dot
| innerDot.innerDotID  | string  | To change inner dot `id` attribute
| outerDot  | Object | Exactly same properties of inner dot except `enabled` option.
| outerDot.enabled  | boolean | To enable or disable outer dot.
| rootToAppend  | HTMLElement | For specify effect root element's append target.
| rootID  | string | For change effect's root element `id` attribute.

