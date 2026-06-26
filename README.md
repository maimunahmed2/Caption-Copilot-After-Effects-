Link to ChatGPT chat: https://chatgpt.com/share/6a3e97ca-b460-83e8-99ae-596ecc7c04dd

# Phrase Caption Pilot v4.9 — Style Template Layer

This version adds the feature you asked for:

You can now create a **sample text layer** in After Effects and make the plugin generate captions by copying that layer's styling.

## What gets copied

Because the plugin duplicates your sample text layer, generated captions can inherit:

- font
- font size
- fill and stroke
- paragraph settings
- tracking
- leading
- justification
- text animators from `Animate > ...`
- effects on the text layer
- other layer styling that comes along with duplication

Then the plugin changes only:

- the word text
- the timing (`inPoint`, `outPoint`)
- the position for caption layout

## Best workflow

1. Create a text layer in your comp.
2. Style it exactly how you want your captions to look.
3. Add any static text animators you want, such as:
   - Skew
   - Tracking
   - Fill Color
   - Stroke Width
   - etc.
4. Select that text layer.
5. In the plugin, go to `Captions`.
6. Click `Use Selected Text Layer As Template`.
7. Generate captions.

## Important note

This works best when your sample text layer is mostly **static**.

If your sample layer has complex **keyframed motion** or **keyframed source text animation**, those keys also get duplicated. This version removes Source Text keys and Position keys on the generated layers, but other animated properties from the template can still carry over.

So for the cleanest results:
- use the sample layer mainly for styling, animators, and effects
- not for full motion animation

## Fallback mode

If you do **not** use a template layer, the plugin still supports the older font-based generation mode.

## Install

Keep these two files together:

```txt
PhraseCaptionPilot.jsx
transcribe-local-whispercpp.js
```

Place them in:

```txt
C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\
```

Restart After Effects and open:

```txt
Window > PhraseCaptionPilot.jsx
```


## v4.6 alignment fix

This version fixes the issue where some generated words move slightly up or down.

The previous layout formula aligned each word by its bounding-box top. Different words have different bounding boxes, especially when the template uses skew, tracking, descenders, or text animators.

v4.6 now uses one shared baseline-style Y position for every word in the same line.

So words like:

```txt
going
little
you
peace
```

should stay on the same line instead of jumping vertically.


## v4.7 phrase-layer mode

This version changes the caption generation style.

Earlier versions created one text layer per word.

v4.7 creates **one text layer per phrase** and adds a **Source Text expression** that reveals the words as their timestamps arrive.

Example output over time:

```txt
Be
Be careful
Be careful with
Be careful with what
Be careful with what you
Be careful with what you say...
```

This keeps the timeline much cleaner and makes editing easier.

## Why this is better

Instead of hundreds of word layers, you get one layer per phrase.

Each phrase layer can still use your template text layer style.

## Editing note

The phrase reveal is controlled by a Source Text expression.

To manually edit the wording after generation, open the generated layer's Source Text expression and edit the `words = [...]` array, or disable the expression and edit the text normally.

A future version can add a custom edit panel for generated phrase text.


## v4.8 Source Text expression fix

v4.7 tried to preserve styling by returning a modified `TextDocument` from the Source Text expression.

Some After Effects versions do not handle that reliably, so the layer can fall back to showing the full phrase.

v4.8 changes the expression to return a plain string:

```jsx
out;
```

This is more reliable for word-by-word phrase reveal.

If a phrase still shows all words at once, twirl open the generated layer:

```txt
Text > Source Text
```

and confirm the expression is enabled. It should contain arrays like:

```jsx
var words = ["Be","careful","with"];
var times = [0.12,0.45,0.78];
```


## v4.9 Words To Show slider

This version makes the word reveal much easier to control.

Each generated phrase layer now gets an effect:

```txt
Effects > Words To Show > Slider
```

The Source Text expression uses this slider to decide how many words should be visible.

Example:

```txt
Slider = 0  -> 
Slider = 1  -> Be
Slider = 2  -> Be careful
Slider = 3  -> Be careful with
```

The plugin automatically adds HOLD keyframes to the slider at each word timestamp.

## Why this is better

You no longer need to edit the Source Text expression to retime captions.

Just open the generated phrase layer:

```txt
Effects > Words To Show > Slider
```

Then move the slider keyframes left or right to change when each word appears.

## Expression logic

The Source Text expression now reads only the slider value:

```jsx
var n = Math.floor(effect("Words To Show")("Slider"));
```

Then it shows the first `n` words.
