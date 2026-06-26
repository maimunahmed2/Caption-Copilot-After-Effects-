/*
Phrase Caption Pilot v4.5 - Local whisper.cpp + Style Template Layer
Author: generated with ChatGPT

Main changes:
- Added style template support.
- You can now create/select a sample text layer in AE and use it as a template.
- Generated caption layers will duplicate that text layer, so they inherit:
  - font
  - font size
  - fill/stroke
  - tracking
  - paragraph settings
  - text animators (Animate > ...)
  - effects
  - other layer styling copied by duplication
- The plugin then replaces only the text content, timing, and position.
- v4.6 fixes vertical word misalignment by using baseline-style positioning.
- v4.7 creates one phrase layer and uses a Source Text expression to reveal words.
- v4.8 fixes Source Text expression output by returning a plain string.
- v4.9 adds a Slider Control named Words To Show for easier reveal control.

Best use:
- Make a sample text layer exactly how you want.
- Add static text animators like skew/tracking/etc.
- Select it and click "Use Selected Text Layer As Template".
- Generate captions.

Note:
- If the template has keyframed motion/transform/source-text animation, those keys are duplicated too.
- For the cleanest results, use a mostly static template layer.
*/

(function PhraseCaptionPilot(thisObj) {
    var SCRIPT_NAME = "Phrase Caption Pilot";
    var VERSION = "v4.9 Local";

    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", SCRIPT_NAME + " " + VERSION, undefined, { resizeable: true });

        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 8;
        win.margins = 10;

        var titleRow = win.add("group");
        titleRow.orientation = "row";
        titleRow.alignChildren = ["left", "center"];

        var title = titleRow.add("statictext", undefined, "Phrase Caption Pilot " + VERSION);
        title.graphics.font = ScriptUI.newFont(title.graphics.font.name, "BOLD", 15);

        var tabs = win.add("tabbedpanel");
        tabs.alignChildren = ["fill", "fill"];
        tabs.preferredSize = [540, 470];

        var sourceTab = tabs.add("tab", undefined, "Source");
        var whisperTab = tabs.add("tab", undefined, "Whisper");
        var captionsTab = tabs.add("tab", undefined, "Captions");

        sourceTab.orientation = "column";
        sourceTab.alignChildren = ["fill", "top"];
        sourceTab.spacing = 8;
        sourceTab.margins = 10;

        whisperTab.orientation = "column";
        whisperTab.alignChildren = ["fill", "top"];
        whisperTab.spacing = 8;
        whisperTab.margins = 10;

        captionsTab.orientation = "column";
        captionsTab.alignChildren = ["fill", "top"];
        captionsTab.spacing = 8;
        captionsTab.margins = 10;

        // -------------------------
        // Source tab
        // -------------------------

        var timelineBtn = sourceTab.add("button", undefined, "Use Selected Timeline Layer");

        var layerInfoText = sourceTab.add("statictext", undefined, "No timeline layer selected yet.");
        layerInfoText.alignment = ["fill", "top"];

        var audioRow = sourceTab.add("group");
        audioRow.orientation = "row";
        audioRow.alignChildren = ["fill", "center"];
        audioRow.add("statictext", undefined, "Media:");
        var audioPath = audioRow.add("edittext", undefined, "");
        audioPath.characters = 40;
        var browseAudioBtn = audioRow.add("button", undefined, "Browse");

        var offsetRow = sourceTab.add("group");
        offsetRow.orientation = "row";
        offsetRow.add("statictext", undefined, "Timing offset:");
        var offsetInput = offsetRow.add("edittext", undefined, "0");
        offsetInput.characters = 8;
        offsetRow.add("statictext", undefined, "seconds");

        var transcriptRow = sourceTab.add("group");
        transcriptRow.orientation = "row";
        transcriptRow.alignChildren = ["fill", "center"];
        transcriptRow.add("statictext", undefined, "JSON:");
        var transcriptPath = transcriptRow.add("edittext", undefined, "");
        transcriptPath.characters = 42;
        var browseJsonBtn = transcriptRow.add("button", undefined, "Browse");

        var sourceHelp = sourceTab.add("statictext", undefined, "Tip: Select your audio/video layer in the timeline first, then click Use Selected Timeline Layer.");
        sourceHelp.alignment = ["fill", "top"];

        // -------------------------
        // Whisper tab
        // -------------------------

        var nodeRow = whisperTab.add("group");
        nodeRow.orientation = "row";
        nodeRow.alignChildren = ["fill", "center"];
        nodeRow.add("statictext", undefined, "Node:");
        var nodeInput = nodeRow.add("edittext", undefined, "node");
        nodeInput.characters = 36;
        var testNodeBtn = nodeRow.add("button", undefined, "Test");

        var whisperRow = whisperTab.add("group");
        whisperRow.orientation = "row";
        whisperRow.alignChildren = ["fill", "center"];
        whisperRow.add("statictext", undefined, "whisper-cli:");
        var whisperPathInput = whisperRow.add("edittext", undefined, "");
        whisperPathInput.characters = 33;
        var browseWhisperBtn = whisperRow.add("button", undefined, "Browse");

        var modelRow = whisperTab.add("group");
        modelRow.orientation = "row";
        modelRow.alignChildren = ["fill", "center"];
        modelRow.add("statictext", undefined, "Model:");
        var modelPathInput = modelRow.add("edittext", undefined, "");
        modelPathInput.characters = 38;
        var browseModelBtn = modelRow.add("button", undefined, "Browse");

        var ffmpegRow = whisperTab.add("group");
        ffmpegRow.orientation = "row";
        ffmpegRow.alignChildren = ["fill", "center"];
        ffmpegRow.add("statictext", undefined, "FFmpeg:");
        var ffmpegPathInput = ffmpegRow.add("edittext", undefined, "ffmpeg");
        ffmpegPathInput.characters = 36;
        var browseFfmpegBtn = ffmpegRow.add("button", undefined, "Browse");

        var langRow = whisperTab.add("group");
        langRow.orientation = "row";
        langRow.add("statictext", undefined, "Language:");
        var languageInput = langRow.add("edittext", undefined, "en");
        languageInput.characters = 6;
        langRow.add("statictext", undefined, "Threads:");
        var threadsInput = langRow.add("edittext", undefined, "4");
        threadsInput.characters = 5;

        var whisperHelp = whisperTab.add("statictext", undefined, "Use medium.en or large-v3-turbo for better accuracy if your PC is fast.");
        whisperHelp.alignment = ["fill", "top"];

        // -------------------------
        // Captions tab
        // -------------------------

        var templatePanel = captionsTab.add("panel", undefined, "Style Template");
        templatePanel.orientation = "column";
        templatePanel.alignChildren = ["fill", "top"];
        templatePanel.margins = 8;

        var templateInfo = templatePanel.add("statictext", undefined, "No template layer selected. Captions will use the basic font settings below.");
        templateInfo.alignment = ["fill", "top"];

        var templateBtnRow = templatePanel.add("group");
        templateBtnRow.orientation = "row";
        templateBtnRow.alignChildren = ["left", "center"];
        var useTemplateBtn = templateBtnRow.add("button", undefined, "Use Selected Text Layer As Template");
        var clearTemplateBtn = templateBtnRow.add("button", undefined, "Clear Template");

        var templateHelp = templatePanel.add("statictext", undefined, "Template mode duplicates your sample text layer so animators like Skew/Tracking are copied too.");
        templateHelp.alignment = ["fill", "top"];

        var fontPanel = captionsTab.add("panel", undefined, "Fallback Text Style (used only when no template is set)");
        fontPanel.orientation = "column";
        fontPanel.alignChildren = ["fill", "top"];
        fontPanel.margins = 8;

        var fontRow = fontPanel.add("group");
        fontRow.orientation = "row";
        fontRow.alignChildren = ["fill", "center"];
        fontRow.add("statictext", undefined, "Font name:");
        var fontInput = fontRow.add("edittext", undefined, "");
        fontInput.characters = 30;
        var getFontBtn = fontRow.add("button", undefined, "Get From Text Layer");

        var fontHelp = fontPanel.add("statictext", undefined, "If you are not using a template layer, you can still capture the exact AE font name here.");
        fontHelp.alignment = ["fill", "top"];

        var settingsPanel = captionsTab.add("panel", undefined, "Layout");
        settingsPanel.orientation = "column";
        settingsPanel.alignChildren = ["fill", "top"];
        settingsPanel.margins = 8;

        var row1 = settingsPanel.add("group");
        row1.orientation = "row";
        row1.add("statictext", undefined, "Font size:");
        var fontSizeInput = row1.add("edittext", undefined, "72");
        fontSizeInput.characters = 5;
        row1.add("statictext", undefined, "Words/phrase:");
        var maxWordsInput = row1.add("edittext", undefined, "5");
        maxWordsInput.characters = 5;

        var row2 = settingsPanel.add("group");
        row2.orientation = "row";
        row2.add("statictext", undefined, "Pause split:");
        var pauseInput = row2.add("edittext", undefined, "0.45");
        pauseInput.characters = 5;
        row2.add("statictext", undefined, "Words/line:");
        var maxLineWordsInput = row2.add("edittext", undefined, "4");
        maxLineWordsInput.characters = 5;

        var row3 = settingsPanel.add("group");
        row3.orientation = "row";
        row3.add("statictext", undefined, "Bottom margin:");
        var bottomMarginInput = row3.add("edittext", undefined, "180");
        bottomMarginInput.characters = 5;
        row3.add("statictext", undefined, "Line gap:");
        var lineGapInput = row3.add("edittext", undefined, "92");
        lineGapInput.characters = 5;

        var row4 = settingsPanel.add("group");
        row4.orientation = "row";
        row4.add("statictext", undefined, "Word spacing:");
        var wordSpacingInput = row4.add("edittext", undefined, "22");
        wordSpacingInput.characters = 5;

        var actionsPanel = captionsTab.add("panel", undefined, "Actions");
        actionsPanel.orientation = "column";
        actionsPanel.alignChildren = ["fill", "top"];
        actionsPanel.margins = 8;

        var localBtn = actionsPanel.add("button", undefined, "Transcribe Locally + Generate Captions");
        var generateFromJsonBtn = actionsPanel.add("button", undefined, "Generate From JSON");

        var actionsHelp = actionsPanel.add("statictext", undefined, "v4.9 uses a Words To Show slider. Edit slider keyframes to retime the word reveal.");
        actionsHelp.alignment = ["fill", "top"];

        tabs.selection = sourceTab;

        // -------------------------
        // Events
        // -------------------------

        timelineBtn.onClick = function () {
            try {
                var result = getSelectedTimelineMedia();
                audioPath.text = result.filePath;
                offsetInput.text = String(round3(result.startOffset));
                transcriptPath.text = defaultTranscriptPath(result.filePath);
                layerInfoText.text = result.layerName + " | offset: " + round3(result.startOffset) + "s";
                alert("Selected timeline media found:\n\n" + result.filePath + "\n\nTiming offset set to " + round3(result.startOffset) + " seconds.");
            } catch (err) {
                alert(SCRIPT_NAME + " Error:\n\n" + err.message);
            }
        };

        browseAudioBtn.onClick = function () {
            var f = File.openDialog("Select audio/video file", "*.wav;*.mp3;*.m4a;*.mp4;*.aac;*.flac;*.ogg;*.webm;*.mov");
            if (f) {
                audioPath.text = f.fsName;
                transcriptPath.text = defaultTranscriptPath(f.fsName);
                layerInfoText.text = "Manual file selected.";
            }
        };

        browseJsonBtn.onClick = function () {
            var f = File.openDialog("Select word-level transcript JSON", "*.json");
            if (f) transcriptPath.text = f.fsName;
        };

        browseWhisperBtn.onClick = function () {
            var f = File.openDialog("Select whisper-cli.exe", "*.exe;*");
            if (f) whisperPathInput.text = f.fsName;
        };

        browseModelBtn.onClick = function () {
            var f = File.openDialog("Select ggml model .bin", "*.bin");
            if (f) modelPathInput.text = f.fsName;
        };

        browseFfmpegBtn.onClick = function () {
            var f = File.openDialog("Select ffmpeg.exe", "*.exe;*");
            if (f) ffmpegPathInput.text = f.fsName;
        };

        testNodeBtn.onClick = function () {
            try {
                var output = system.callSystem(quoteCmd(nodeInput.text) + " --version");
                alert("Node response:\n" + output);
            } catch (e) {
                alert("Could not run Node.\n\nInstall Node.js 18+, or set the full path to node.exe.");
            }
        };

        getFontBtn.onClick = function () {
            try {
                var fontName = getFontFromSelectedTextLayer();
                fontInput.text = fontName;
                alert("Font captured:\n\n" + fontName + "\n\nUse this exact font name for generation.");
            } catch (err) {
                alert(SCRIPT_NAME + " Error:\n\n" + err.message);
            }
        };

        useTemplateBtn.onClick = function () {
            try {
                var info = getTemplateLayerInfoFromSelectedTextLayer();
                templateInfo.text = "Template: " + info.layerName + "  |  Font: " + info.fontName;
                templateInfo.properties = {
                    templateLayerName: info.layerName
                };
                alert(
                    "Template layer captured:\n\n" +
                    "Layer: " + info.layerName +
                    "\nFont: " + info.fontName +
                    "\n\nGenerated captions will now duplicate this layer's styling and text animators."
                );
            } catch (err) {
                alert(SCRIPT_NAME + " Error:\n\n" + err.message);
            }
        };

        clearTemplateBtn.onClick = function () {
            templateInfo.text = "No template layer selected. Captions will use the basic font settings below.";
            templateInfo.properties = { templateLayerName: "" };
        };

        localBtn.onClick = function () {
            try {
                var outputPath = defaultTranscriptPath(audioPath.text);
                transcriptPath.text = outputPath;

                runLocalWhisperCpp({
                    nodePath: nodeInput.text,
                    audioPath: audioPath.text,
                    outputPath: outputPath,
                    whisperPath: whisperPathInput.text,
                    modelPath: modelPathInput.text,
                    ffmpegPath: ffmpegPathInput.text,
                    language: languageInput.text,
                    threads: safeInt(threadsInput.text, 4)
                });

                generateCaptionsFromPath(outputPath, getCaptionSettings());
            } catch (err) {
                alert(SCRIPT_NAME + " Error:\n\n" + err.message);
            }
        };

        generateFromJsonBtn.onClick = function () {
            try {
                generateCaptionsFromPath(transcriptPath.text, getCaptionSettings());
            } catch (err) {
                alert(SCRIPT_NAME + " Error:\n\n" + err.message);
            }
        };

        function getCaptionSettings() {
            var templateLayerName = "";
            try {
                if (templateInfo.properties && templateInfo.properties.templateLayerName) {
                    templateLayerName = templateInfo.properties.templateLayerName;
                }
            } catch (e) {}

            return {
                maxWords: safeInt(maxWordsInput.text, 5),
                pauseThreshold: safeFloat(pauseInput.text, 0.45),
                fontSize: safeInt(fontSizeInput.text, 72),
                bottomMargin: safeInt(bottomMarginInput.text, 180),
                wordSpacing: safeInt(wordSpacingInput.text, 22),
                maxLineWords: safeInt(maxLineWordsInput.text, 4),
                lineGap: safeInt(lineGapInput.text, 92),
                timeOffset: safeFloat(offsetInput.text, 0),
                fontName: trim(fontInput.text),
                templateLayerName: templateLayerName
            };
        }

        win.layout.layout(true);
        win.layout.resize();

        return win;
    }

    function getFontFromSelectedTextLayer() {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) throw new Error("Please open/select a composition first.");
        if (!comp.selectedLayers || comp.selectedLayers.length === 0) throw new Error("Select one text layer that uses the font you want.");
        if (comp.selectedLayers.length > 1) throw new Error("Select only one text layer for font capture.");

        var layer = comp.selectedLayers[0];
        var sourceText = null;

        try { sourceText = layer.property("Source Text"); } catch (e) {}
        if (!sourceText) throw new Error("Selected layer is not a text layer. Create/select a text layer with your desired font.");

        var doc = sourceText.value;
        if (!doc || !doc.font) throw new Error("Could not read the selected text layer font.");

        return doc.font;
    }

    function getTemplateLayerInfoFromSelectedTextLayer() {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) throw new Error("Please open/select a composition first.");
        if (!comp.selectedLayers || comp.selectedLayers.length === 0) throw new Error("Select one text layer to use as the style template.");
        if (comp.selectedLayers.length > 1) throw new Error("Select only one text layer as the style template.");

        var layer = comp.selectedLayers[0];
        var sourceText = null;

        try { sourceText = layer.property("Source Text"); } catch (e) {}
        if (!sourceText) throw new Error("Selected layer is not a text layer.");

        var doc = sourceText.value;

        return {
            layerName: layer.name,
            fontName: (doc && doc.font) ? doc.font : "(unknown)"
        };
    }

    function findLayerByName(comp, layerName) {
        if (!layerName || layerName === "") return null;
        var i, layer;
        for (i = 1; i <= comp.numLayers; i++) {
            layer = comp.layer(i);
            if (layer && layer.name === layerName) return layer;
        }
        return null;
    }

    function getSelectedTimelineMedia() {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) throw new Error("Please open/select a composition first.");
        if (!comp.selectedLayers || comp.selectedLayers.length === 0) throw new Error("Please select one audio/video layer in the timeline.");
        if (comp.selectedLayers.length > 1) throw new Error("Please select only one timeline layer for now.");

        var layer = comp.selectedLayers[0];
        if (!layer.source) throw new Error("The selected layer has no source media. Select an imported audio/video layer.");

        var source = layer.source;
        if (!(source instanceof FootageItem)) {
            throw new Error("The selected layer source is not a direct footage file. If this is a precomp, select the original audio/video layer inside it.");
        }

        if (!source.file) throw new Error("The selected footage does not have a readable source file path.");

        var filePath = source.file.fsName;
        var file = new File(filePath);
        if (!file.exists) throw new Error("The selected media file was not found on disk:\n" + filePath);

        var startOffset = 0;
        try {
            startOffset = Number(layer.startTime);
            if (isNaN(startOffset)) startOffset = 0;
        } catch (e) {}

        var stretch = 100;
        try { stretch = Number(layer.stretch); } catch (e2) {}
        if (!isNaN(stretch) && Math.abs(stretch - 100) > 0.01) {
            alert("Heads up: this layer has stretch/speed changed (" + stretch + "%). Captions may drift in this MVP.");
        }

        try {
            if (layer.timeRemapEnabled) alert("Heads up: this layer has Time Remapping enabled. Captions may drift in this MVP.");
        } catch (e3) {}

        return { filePath: filePath, layerName: layer.name, startOffset: startOffset };
    }

    function runLocalWhisperCpp(options) {
        if (!options.audioPath || options.audioPath === "") throw new Error("Please select an audio/video file first.");
        if (!options.whisperPath || options.whisperPath === "") throw new Error("Please select whisper-cli.exe.");
        if (!options.modelPath || options.modelPath === "") throw new Error("Please select a ggml model .bin file.");
        if (!options.ffmpegPath || options.ffmpegPath === "") throw new Error("Please set ffmpeg path. Use 'ffmpeg' if it is already in PATH.");

        var audioFile = new File(options.audioPath);
        if (!audioFile.exists) throw new Error("Audio file does not exist:\n" + options.audioPath);

        var whisperFile = new File(options.whisperPath);
        if (!whisperFile.exists) throw new Error("whisper-cli was not found:\n" + options.whisperPath);

        var modelFile = new File(options.modelPath);
        if (!modelFile.exists) throw new Error("Model file was not found:\n" + options.modelPath);

        var helperPath = File($.fileName).parent.fsName + "/transcribe-local-whispercpp.js";
        var helperFile = new File(helperPath);
        if (!helperFile.exists) throw new Error("Missing helper file:\n" + helperPath + "\n\nKeep transcribe-local-whispercpp.js next to PhraseCaptionPilot.jsx.");

        var tempPath = Folder.temp.fsName + "/captionpilot_local_request_" + (new Date().getTime()) + ".json";

        var request = {
            audioPath: audioFile.fsName,
            outputPath: options.outputPath,
            whisperPath: whisperFile.fsName,
            modelPath: modelFile.fsName,
            ffmpegPath: options.ffmpegPath,
            language: options.language || "en",
            threads: options.threads || 4
        };

        writeTextFile(tempPath, stringifyJSON(request));

        var command = quoteCmd(options.nodePath || "node") + " " + quoteCmd(helperPath) + " --request " + quoteCmd(tempPath);
        var output = system.callSystem(command);

        try {
            var tempFile = new File(tempPath);
            if (tempFile.exists) tempFile.remove();
        } catch (cleanupErr) {}

        if (!output || output.indexOf("CAPTIONPILOT_OK") === -1) {
            throw new Error("Local transcription failed.\n\nCommand output:\n" + output + "\n\nCheck whisper-cli, model path, ffmpeg, and file format.");
        }

        return options.outputPath;
    }

    function quoteCmd(s) {
        s = String(s || "");
        if (s === "") s = "node";
        return '"' + s.replace(/"/g, '\\"') + '"';
    }

    function safeInt(value, fallback) {
        var n = parseInt(value, 10);
        return isNaN(n) ? fallback : n;
    }

    function safeFloat(value, fallback) {
        var n = parseFloat(value);
        return isNaN(n) ? fallback : n;
    }

    function round3(n) {
        return Math.round(Number(n) * 1000) / 1000;
    }

    function readTextFile(path) {
        if (!path || path === "") throw new Error("Please select a transcript JSON file.");

        var candidates = [
            String(path),
            String(path).replace(/\//g, "\\"),
            String(path).replace(/\\/g, "/")
        ];

        var lastError = "";

        for (var i = 0; i < candidates.length; i++) {
            var f = new File(candidates[i]);
            f.encoding = "UTF-8";

            try {
                if (f.open("r")) {
                    var text = f.read();
                    f.close();
                    return text;
                }
            } catch (e) {
                lastError = e.message;
                try { f.close(); } catch (closeErr) {}
            }
        }

        throw new Error("Could not open transcript JSON.\n\nTried:\n" + candidates.join("\n") + "\n\nLast error:\n" + lastError + "\n\nIf the file exists, click JSON > select it manually > Generate From JSON.");
    }

    function writeTextFile(path, text) {
        var f = new File(path);
        f.encoding = "UTF-8";
        if (!f.open("w")) throw new Error("Could not write file:\n" + path);
        f.write(text);
        f.close();
    }

    function parseJSON(text) {
        if (typeof JSON !== "undefined" && JSON.parse) return JSON.parse(text);
        return eval("(" + text + ")");
    }

    function stringifyJSON(obj) {
        if (typeof JSON !== "undefined" && JSON.stringify) return JSON.stringify(obj, null, 2);
        throw new Error("JSON.stringify is not available in this After Effects version.");
    }

    function defaultTranscriptPath(audioFsName) {
        if (!audioFsName || audioFsName === "") return "";

        var f = new File(audioFsName);
        var parent = f.parent.fsName;
        var rawName = "";

        try { rawName = f.displayName; } catch (displayErr) {}
        if (!rawName || rawName === "") rawName = f.name;

        try {
            rawName = decodeURIComponent(rawName);
        } catch (decodeErr1) {
            try { rawName = decodeURI(rawName); } catch (decodeErr2) {}
        }

        var name = rawName.replace(/\.[^\.]+$/, "");
        name = name.replace(/[<>:"\/\\|?*]/g, "_");

        return parent + "/" + name + ".captionpilot.local.words.json";
    }

    function normalizeWords(data) {
        var words = [];
        var i, j, segmentWords, w;

        if (data.words && data.words.length) {
            for (i = 0; i < data.words.length; i++) {
                w = normalizeWord(data.words[i]);
                if (w) words.push(w);
            }
            return words;
        }

        if (data.segments && data.segments.length) {
            for (i = 0; i < data.segments.length; i++) {
                segmentWords = data.segments[i].words;
                if (!segmentWords) continue;

                for (j = 0; j < segmentWords.length; j++) {
                    w = normalizeWord(segmentWords[j]);
                    if (w) words.push(w);
                }
            }
            return words;
        }

        throw new Error("No words found. Expected data.words[] or data.segments[].words[].");
    }

    function normalizeWord(item) {
        if (!item) return null;
        var raw = item.word || item.text || "";
        var text = trim(String(raw));
        if (text === "") return null;

        var start = parseFloat(item.start);
        var end = parseFloat(item.end);

        if (isNaN(start)) return null;
        if (isNaN(end)) end = start + 0.25;

        return { word: text, start: Math.max(0, start), end: Math.max(start + 0.05, end) };
    }

    function applyTimeOffset(words, offset) {
        var shifted = [];
        var i, w, s, e;

        offset = Number(offset);
        if (isNaN(offset)) offset = 0;

        for (i = 0; i < words.length; i++) {
            w = words[i];
            s = w.start + offset;
            e = w.end + offset;
            if (e <= 0) continue;

            shifted.push({ word: w.word, start: Math.max(0, s), end: Math.max(0.05, e) });
        }

        return shifted;
    }

    function trim(s) {
        return String(s || "").replace(/^\s+|\s+$/g, "");
    }

    function endsSentence(word) {
        return /[.?!]$/.test(word);
    }

    function groupIntoPhrases(words, maxWords, pauseThreshold) {
        var phrases = [];
        var current = [];
        var i, word, nextWord, pause;

        for (i = 0; i < words.length; i++) {
            word = words[i];
            current.push(word);

            nextWord = words[i + 1];
            pause = nextWord ? nextWord.start - word.end : 999;

            if (current.length >= maxWords || pause >= pauseThreshold || endsSentence(word.word) || !nextWord) {
                phrases.push({
                    words: current,
                    start: current[0].start,
                    end: current[current.length - 1].end
                });

                current = [];
            }
        }

        return phrases;
    }

    function splitPhraseIntoLines(words, maxLineWords) {
        var lines = [];
        var line = [];
        var i;

        for (i = 0; i < words.length; i++) {
            line.push(words[i]);

            if (line.length >= maxLineWords || i === words.length - 1) {
                lines.push(line);
                line = [];
            }
        }

        return lines;
    }

    function jsString(s) {
        s = String(s || "");
        s = s.replace(/\\/g, "\\\\");
        s = s.replace(/"/g, '\\"');
        s = s.replace(/\r/g, "\\r");
        s = s.replace(/\n/g, "\\n");
        return '"' + s + '"';
    }

    function buildPhraseText(words, maxLineWords) {
        var out = "";
        for (var i = 0; i < words.length; i++) {
            if (i > 0) {
                out += (i % maxLineWords === 0) ? "\r" : " ";
            }
            out += words[i].word;
        }
        return out;
    }

    function buildSourceTextRevealExpression(words, maxLineWords) {
        var wordItems = [];
        var i;

        for (i = 0; i < words.length; i++) {
            wordItems.push(jsString(words[i].word));
        }

        // v4.9:
        // Source Text is now controlled by the "Words To Show" Slider Control.
        // This makes timing easier to edit because users can move slider keyframes
        // instead of touching the expression.
        return [
            "var words = [" + wordItems.join(",") + "];",
            "var maxPerLine = " + maxLineWords + ";",
            "var n = 0;",
            "try {",
            "  n = Math.floor(effect('Words To Show')('Slider'));",
            "} catch (err) {",
            "  n = words.length;",
            "}",
            "n = Math.max(0, Math.min(n, words.length));",
            "var out = '';",
            "for (var i = 0; i < n; i++) {",
            "  if (out != '') {",
            "    out += (i % maxPerLine == 0) ? '\\r' : ' ';",
            "  }",
            "  out += words[i];",
            "}",
            "out;"
        ].join("\n");
    }

    function addWordsToShowSlider(layer, words) {
        var effects = null;
        try {
            effects = layer.property("Effects");
        } catch (e0) {}

        if (!effects) {
            return;
        }

        var sliderEffect = null;

        // If a duplicated template already has a slider with the same name,
        // reuse it instead of creating duplicates.
        try {
            for (var i = 1; i <= effects.numProperties; i++) {
                if (effects.property(i).name === "Words To Show") {
                    sliderEffect = effects.property(i);
                    break;
                }
            }
        } catch (searchErr) {}

        if (!sliderEffect) {
            try {
                sliderEffect = effects.addProperty("ADBE Slider Control");
                sliderEffect.name = "Words To Show";
            } catch (addErr) {
                return;
            }
        }

        var slider = null;
        try {
            slider = sliderEffect.property("Slider");
        } catch (e1) {}

        if (!slider) {
            try {
                slider = sliderEffect.property(1);
            } catch (e2) {}
        }

        if (!slider) {
            return;
        }

        // Remove previous slider keys if this came from the template.
        try {
            while (slider.numKeys && slider.numKeys > 0) {
                slider.removeKey(1);
            }
        } catch (removeErr) {}

        // At each word timestamp, increase the number of visible words.
        // This creates editable timing points for the reveal.
        try {
            for (var w = 0; w < words.length; w++) {
                slider.setValueAtTime(words[w].start, w + 1);
            }

            // Make the keyframes HOLD so the visible word count jumps cleanly.
            try {
                for (var k = 1; k <= slider.numKeys; k++) {
                    slider.setInterpolationTypeAtKey(
                        k,
                        KeyframeInterpolationType.HOLD,
                        KeyframeInterpolationType.HOLD
                    );
                }
            } catch (interpErr) {}
        } catch (keyErr) {
            try {
                slider.setValue(words.length);
            } catch (setErr) {}
        }
    }

    function createPhraseLayer(comp, phrase, settings, startTime, outTime) {
        var phraseText = buildPhraseText(phrase.words, settings.maxLineWords);

        var templateLayer = null;
        if (settings.templateLayerName && settings.templateLayerName !== "") {
            templateLayer = findLayerByName(comp, settings.templateLayerName);
        }

        var layer;
        if (templateLayer) {
            layer = templateLayer.duplicate();
            layer.name = "CP_PHRASE_" + phraseText.substring(0, 40);

            try {
                var src = layer.property("Source Text");
                if (src) {
                    while (src.numKeys && src.numKeys > 0) {
                        src.removeKey(1);
                    }

                    var doc = src.value;
                    doc.text = phraseText;
                    src.setValue(doc);
                }
            } catch (e1) {}
        } else {
            layer = comp.layers.addText(phraseText);
            layer.name = "CP_PHRASE_" + phraseText.substring(0, 40);

            var sourceText = layer.property("Source Text");
            var doc2 = sourceText.value;
            doc2.text = phraseText;
            doc2.fontSize = settings.fontSize;
            doc2.applyFill = true;
            doc2.fillColor = [1, 1, 1];
            doc2.applyStroke = false;
            doc2.justification = ParagraphJustification.CENTER_JUSTIFY;

            try {
                doc2.autoLeading = false;
                doc2.leading = settings.lineGap;
            } catch (leadingErr) {}

            if (settings.fontName && settings.fontName !== "") {
                try { doc2.font = settings.fontName; } catch (fontErr) {}
            }

            sourceText.setValue(doc2);
        }

        layer.inPoint = startTime;
        layer.outPoint = outTime;

        try {
            var posProp = layer.property("Transform").property("Position");
            while (posProp.numKeys && posProp.numKeys > 0) {
                posProp.removeKey(1);
            }
        } catch (e2) {}

        // Add editable reveal timing controls.
        addWordsToShowSlider(layer, phrase.words);

        try {
            var sourceTextProp = layer.property("Source Text");
            sourceTextProp.expression = buildSourceTextRevealExpression(phrase.words, settings.maxLineWords);
        } catch (exprErr) {
            alert("Could not add Source Text expression on a generated phrase layer.\n\n" + exprErr.message);
        }

        return layer;
    }

    function measureLayer(layer, time) {
        try {
            return layer.sourceRectAtTime(time, false);
        } catch (e) {
            return { left: 0, top: 0, width: 100, height: 70 };
        }
    }

    function generateCaptionsFromPath(transcriptFilePath, settings) {
        app.beginUndoGroup(SCRIPT_NAME);

        try {
            var comp = app.project.activeItem;
            if (!(comp instanceof CompItem)) throw new Error("Please open/select an active composition first.");

            var jsonText = readTextFile(transcriptFilePath);
            var data = parseJSON(jsonText);
            var words = normalizeWords(data);
            if (!words.length) throw new Error("Transcript has no valid timed words.");

            words = applyTimeOffset(words, settings.timeOffset);
            if (!words.length) throw new Error("All transcript words landed before the comp start after applying timing offset.");

            var usingTemplate = settings.templateLayerName && settings.templateLayerName !== "";
            if (usingTemplate && !findLayerByName(comp, settings.templateLayerName)) {
                throw new Error("Template layer not found in the current composition:\n" + settings.templateLayerName + "\n\nRe-select the text layer and capture it again.");
            }

            var phrases = groupIntoPhrases(words, settings.maxWords, settings.pauseThreshold);
            var createdLayers = 0;

            var p, phrase, layer, rect, measureTime, x, y, phraseOut;

            for (p = 0; p < phrases.length; p++) {
                phrase = phrases[p];
                phraseOut = Math.min(comp.duration, phrase.end + 0.55);

                layer = createPhraseLayer(comp, phrase, settings, phrase.start, phraseOut);

                // Measure at a time when the whole phrase is visible,
                // so the final full phrase is centered.
                measureTime = Math.min(phraseOut - 0.01, phrase.end + 0.05);
                rect = measureLayer(layer, measureTime);

                x = (comp.width - rect.width) / 2 - rect.left;

                // Baseline-style vertical placement.
                // Template leading/paragraph settings control multiline spacing.
                y = comp.height - settings.bottomMargin;

                try {
                    layer.property("Transform").property("Position").setValue([x, y]);
                } catch (posErr) {}

                createdLayers++;
            }

            alert(
                "Done.\nCreated " + createdLayers +
                " phrase caption layers from " + phrases.length +
                " phrases.\nMode: Source Text word reveal expression" +
                "\nTemplate: " + (usingTemplate ? settings.templateLayerName : "none") +
                "\nTiming offset: " + round3(settings.timeOffset) + "s"
            );
        } finally {
            app.endUndoGroup();
        }
    }

    var panel = buildUI(thisObj);
    if (panel instanceof Window) {
        panel.center();
        panel.show();
    }
})(this);
