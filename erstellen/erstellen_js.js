(function () {
    "use strict";

    var DEFAULT_TITLE = "liste";
    var DEFAULT_FOLDER = "test";
    var DEFAULT_ASK_WITH = "Franz\u00f6sisch";
    var DEFAULT_ASK_FOR = "Deutsch";
    var DEFAULT_TITLE_PREFIX = "franz_";
    var ISSUE_TEMPLATE = "list-submission.md";
    var ISSUE_LABEL = "list-submission";
    var ISSUE_BASE_URL = "https://github.com/einmeterhecht/vokabeltraining/issues/new";

    var dom = {
        nameInput: document.getElementById("name-input"),
        folderInput: document.getElementById("folder-input"),
        askWithInput: document.getElementById("ask-with-input"),
        askForInput: document.getElementById("ask-for-input"),
        dividerAttrInput: document.getElementById("divider-attr-input"),
        dividerQuestionInput: document.getElementById("divider-question-input"),
        inputData: document.getElementById("input-data"),
        pasteButton: document.getElementById("paste-button"),
        submitButton: document.getElementById("submit-button"),
        downloadButton: document.getElementById("download-button"),
        submitMenu: document.getElementById("submit-menu"),
        previewList: document.getElementById("preview-list"),
        previewCount: document.getElementById("preview-count"),
        toastContainer: document.getElementById("toast-container"),
        targetPath: document.getElementById("target-path")
    };

    if (
        !dom.nameInput ||
        !dom.folderInput ||
        !dom.askWithInput ||
        !dom.askForInput ||
        !dom.dividerAttrInput ||
        !dom.dividerQuestionInput ||
        !dom.inputData ||
        !dom.pasteButton ||
        !dom.submitButton ||
        !dom.downloadButton ||
        !dom.submitMenu ||
        !dom.previewList ||
        !dom.previewCount ||
        !dom.toastContainer ||
        !dom.targetPath
    ) {
        return;
    }

    if (!String(dom.nameInput.value || "").trim()) {
        dom.nameInput.value = DEFAULT_TITLE_PREFIX + getCurrentDateIso();
    }

    [
        dom.nameInput,
        dom.folderInput,
        dom.askWithInput,
        dom.askForInput,
        dom.dividerAttrInput,
        dom.dividerQuestionInput,
        dom.inputData
    ].forEach(function (element) {
        element.addEventListener("input", updateUi);
    });

    dom.pasteButton.addEventListener("click", pasteFromClipboard);
    dom.submitButton.addEventListener("click", submitCurrentList);
    dom.downloadButton.addEventListener("click", downloadCurrentList);

    updateUi();

    function getCurrentDateIso() {
        var now = new Date();
        var month = String(now.getMonth() + 1).padStart(2, "0");
        var day = String(now.getDate()).padStart(2, "0");

        return now.getFullYear() + "-" + month + "-" + day;
    }

    function showToast(message, variant) {
        var toast = document.createElement("div");
        toast.className = "toast" + (variant ? " " + variant : "");
        toast.textContent = message;
        dom.toastContainer.appendChild(toast);

        requestAnimationFrame(function () {
            toast.classList.add("show");
        });

        setTimeout(function () {
            toast.classList.remove("show");
            setTimeout(function () {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 180);
        }, 3200);
    }

    function normalizeLineEndings(value) {
        return String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    }

    function decodeEscapes(value) {
        return String(value || "")
            .replace(/\\r/g, "\r")
            .replace(/\\n/g, "\n")
            .replace(/\\t/g, "\t");
    }

    function normalizeKey(value, fallbackValue) {
        var clean = String(value || "").trim().replace(/\s+/g, "_");
        return clean || fallbackValue;
    }

    function normalizePathSegment(value, fallbackValue) {
        var clean = String(value || "")
            .trim()
            .replace(/^\/+|\/+$/g, "")
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_-]/g, "_");

        return clean || fallbackValue;
    }

    function getAskWithKey() {
        return normalizeKey(dom.askWithInput.value, DEFAULT_ASK_WITH);
    }

    function getAskForKey() {
        return normalizeKey(dom.askForInput.value, DEFAULT_ASK_FOR);
    }

    function normalizeTitle(value) {
        return normalizePathSegment(value, DEFAULT_TITLE);
    }

    function normalizeFolder(value) {
        return normalizePathSegment(value, DEFAULT_FOLDER);
    }

    function parseQuestions() {
        var dividerAttr = decodeEscapes(dom.dividerAttrInput.value);
        var dividerQuestions = decodeEscapes(dom.dividerQuestionInput.value);
        var input = normalizeLineEndings(dom.inputData.value);
        var rows = [];

        if (!dividerAttr) {
            return {
                questions: rows,
                warning: "Trennzeichen Frage <-> Antwort darf nicht leer sein."
            };
        }

        if (!dividerQuestions) {
            return {
                questions: rows,
                warning: "Trennzeichen Frage <-> N\u00e4chste Frage darf nicht leer sein."
            };
        }

        var index = 0;

        while (index <= input.length) {
            var attrEndIndex = input.indexOf(dividerAttr, index);
            if (attrEndIndex === -1) {
                break;
            }

            var questionEndIndex = input.indexOf(dividerQuestions, attrEndIndex + dividerAttr.length);
            if (questionEndIndex === -1) {
                questionEndIndex = input.length;
            }

            var question = input.slice(index, attrEndIndex).trim();
            var answer = input.slice(attrEndIndex + dividerAttr.length, questionEndIndex).trim();

            if (question || answer) {
                rows.push([question, answer]);
            }

            if (questionEndIndex === input.length) {
                break;
            }

            index = questionEndIndex + dividerQuestions.length;
        }

        return {
            questions: rows,
            warning: ""
        };
    }

    function buildSubmissionPayload(questionPairs) {
        var askWithKey = getAskWithKey();
        var askForKey = getAskForKey();

        return {
            title: normalizeTitle(dom.nameInput.value),
            target: normalizeFolder(dom.folderInput.value),
            frage_attribut: askWithKey,
            antwort_attribut: askForKey,
            hinweis_attribute: ["Beispiele", "Lernhilfe"],
            fragen: questionPairs.map(function (pair) {
                var item = {};
                item[askWithKey] = [pair[0]];
                item[askForKey] = [pair[1]];
                return item;
            })
        };
    }

    function buildJsListObject(questionPairs) {
        var askWithKey = getAskWithKey();
        var askForKey = getAskForKey();

        return {
            fragen: questionPairs.map(function (pair) {
                var item = {};
                item[askWithKey] = [pair[0]];
                item[askForKey] = [pair[1]];
                return item;
            }),
            hinweis_attribute: ["Beispiele", "Lernhilfe"],
            titel: normalizeTitle(dom.nameInput.value),
            frage_attribut: askWithKey
        };
    }

    function createPreviewRow(label, value) {
        var row = document.createElement("span");
        var key = document.createElement("span");

        row.className = "preview-row";
        key.className = "preview-key";
        key.textContent = label + ":";

        row.appendChild(key);
        row.appendChild(document.createTextNode(" " + value));

        return row;
    }

    function renderPreview(questionPairs) {
        var askWithLabel = getAskWithKey().replace(/_/g, " ");
        var askForLabel = getAskForKey().replace(/_/g, " ");
        var fragment;

        dom.previewList.innerHTML = "";

        if (questionPairs.length === 0) {
            var emptyItem = document.createElement("li");
            emptyItem.className = "empty-hint";
            emptyItem.textContent = "Noch keine Eintr\u00e4ge erkannt.";
            dom.previewList.appendChild(emptyItem);
            return;
        }

        fragment = document.createDocumentFragment();

        questionPairs.forEach(function (pair) {
            var item = document.createElement("li");
            item.className = "preview-item";
            item.appendChild(createPreviewRow(askWithLabel, pair[0]));
            item.appendChild(createPreviewRow(askForLabel, pair[1]));
            fragment.appendChild(item);
        });

        dom.previewList.appendChild(fragment);
    }

    function updateTargetPath() {
        var folder = normalizeFolder(dom.folderInput.value);
        var title = normalizeTitle(dom.nameInput.value);
        dom.targetPath.textContent = "Ziel: /abfragen/listen/" + folder + "/" + title + ".js";
    }

    function updateUi() {
        var parsed = parseQuestions();

        renderPreview(parsed.questions);

        if (parsed.warning) {
            dom.previewCount.textContent = parsed.warning;
        } else {
            dom.previewCount.textContent = parsed.questions.length + " " + (parsed.questions.length === 1 ? "Frage" : "Fragen") + " erkannt";
        }

        updateTargetPath();
    }

    function getValidatedQuestionPairs() {
        var parsed = parseQuestions();
        if (parsed.warning) {
            showToast(parsed.warning, "error");
            return null;
        }
        if (!parsed.questions.length) {
            showToast("Keine Fragen erkannt. Bitte Eingabe pr\u00fcfen.", "error");
            return null;
        }
        return parsed.questions;
    }

    function submitCurrentList() {
        var questionPairs = getValidatedQuestionPairs();
        var payload;
        var body;
        var params;

        if (!questionPairs) {
            return;
        }

        payload = buildSubmissionPayload(questionPairs);
        body = [
            "Automatisch erzeugte Einreichung aus `erstellen/`.",
            "",
            "Hinweis: Bitte den JSON-Block zwischen den Markierungen nicht entfernen.",
            "",
            "<!-- LIST_SUBMISSION_START -->",
            "```json",
            JSON.stringify(payload, null, 2),
            "```",
            "<!-- LIST_SUBMISSION_END -->"
        ].join("\n");

        params = new URLSearchParams();
        params.set("template", ISSUE_TEMPLATE);
        params.set("labels", ISSUE_LABEL);
        params.set("title", "[List Submission] " + payload.title);
        params.set("body", body);

        window.open(ISSUE_BASE_URL + "?" + params.toString(), "_blank", "noopener,noreferrer");
        showToast(questionPairs.length + " Fragen f\u00fcr GitHub-Issue vorbereitet.", "success");
    }

    function downloadCurrentList() {
        var questionPairs = getValidatedQuestionPairs();
        var listObject;
        var content;
        var blob;
        var url;
        var anchor;

        if (!questionPairs) {
            return;
        }

        listObject = buildJsListObject(questionPairs);
        content = "var liste = " + JSON.stringify(listObject, null, 4) + ";\n\nerste_aufgabe();\n";
        blob = new Blob([content], { type: "text/javascript;charset=utf-8" });
        url = URL.createObjectURL(blob);
        anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = listObject.titel + ".js";
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        dom.submitMenu.open = false;
        showToast(questionPairs.length + " Fragen exportiert.", "success");
    }

    async function getClipboardPermissionState() {
        if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
            return "unknown";
        }

        try {
            var permissionStatus = await navigator.permissions.query({ name: "clipboard-read" });
            return permissionStatus.state || "unknown";
        } catch (_error) {
            return "unknown";
        }
    }

    async function pasteFromClipboard() {
        if (!window.isSecureContext) {
            showToast("Zwischenablage nur in sicherem Kontext verf\u00fcgbar (https/localhost).", "error");
            return;
        }

        if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
            showToast("Zwischenablage nicht verf\u00fcgbar. Bitte manuell einf\u00fcgen.", "error");
            return;
        }

        var permissionState = await getClipboardPermissionState();
        if (permissionState === "denied") {
            showToast("Zwischenablage-Zugriff blockiert. Bitte Browser-Berechtigung erlauben.", "error");
            return;
        }

        if (permissionState === "prompt") {
            showToast("Bitte Zwischenablage-Zugriff im Browser erlauben...");
        }

        try {
            var text = await navigator.clipboard.readText();

            if (!text) {
                showToast("Zwischenablage ist leer.");
                return;
            }

            dom.inputData.value = text;
            updateUi();
            showToast("Text aus Zwischenablage eingef\u00fcgt.", "success");
        } catch (_error) {
            showToast("Zwischenablage konnte nicht gelesen werden. Rechte bitte best\u00e4tigen.", "error");
        }
    }
})();
