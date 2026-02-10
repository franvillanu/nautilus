import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";

let taskEditor = null;
let taskEditorElement = null;
let taskEditorHiddenField = null;
let taskEditorKeydownHandler = null;
let taskEditorHooks = {
    onFocus: null,
    onBlur: null,
    onUpdate: null
};

function normalizeInputHtml(html) {
    return typeof html === "string" ? html : "";
}

function normalizeOutputHtml(html) {
    const trimmed = normalizeInputHtml(html).trim();
    if (trimmed === "<p></p>" || trimmed === "<p><br></p>") {
        return "";
    }
    return trimmed;
}

function syncHiddenField(html) {
    if (!taskEditorHiddenField) return;
    taskEditorHiddenField.value = normalizeOutputHtml(html);
}

function getSelectionTaskItem() {
    if (typeof document === "undefined") return null;
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode || null;

    if (anchorNode && taskEditorElement) {
        const anchorElement = anchorNode.nodeType === Node.ELEMENT_NODE
            ? anchorNode
            : anchorNode.parentElement;
        if (anchorElement && typeof anchorElement.closest === "function") {
            const taskItem = anchorElement.closest('li[data-type="taskItem"]');
            if (taskItem) return taskItem;
        }
    }

    if (!taskEditorElement) return null;
    return taskEditorElement.querySelector('li[data-type="taskItem"].ProseMirror-selectednode');
}

function isTaskItemContentEmpty(taskItem) {
    if (!taskItem) return false;
    const content = taskItem.querySelector("div");
    if (!content) return false;
    const text = (content.textContent || "").replace(/\u200B/g, "").trim();
    return text.length === 0;
}

function getSiblingTaskItemCount(taskItem) {
    const list = taskItem?.closest('ul[data-type="taskList"]');
    if (!list) return 0;
    return Array.from(list.children).filter((child) => (
        child && child.nodeType === Node.ELEMENT_NODE && child.matches('li[data-type="taskItem"]')
    )).length;
}

function removeOrExitTaskItem(key) {
    if (!taskEditor || !taskEditorElement) return false;
    if (!taskEditor.isActive("taskItem")) return false;

    const taskItem = getSelectionTaskItem();
    if (!taskItem) {
        return false;
    }

    const isEmpty = isTaskItemContentEmpty(taskItem);
    const selection = taskEditor.state?.selection;
    const isCollapsed = !!selection?.empty;
    const atStartOfTextblock = isCollapsed && selection.$from.parentOffset === 0;
    const shouldExitEmpty = (key === "Backspace" || key === "Delete" || key === "Enter") && isEmpty;
    const shouldLiftFromStart = key === "Backspace" && atStartOfTextblock;

    if (!shouldExitEmpty && !shouldLiftFromStart) {
        return false;
    }

    const siblingCount = getSiblingTaskItemCount(taskItem);
    if (siblingCount <= 1) {
        return taskEditor.chain().focus().toggleTaskList().run();
    }

    return taskEditor.chain().focus().liftListItem("taskItem").run();
}

function bindTaskEditorKeydownHandler() {
    if (!taskEditorElement) return;
    if (taskEditorKeydownHandler) {
        taskEditorElement.removeEventListener("keydown", taskEditorKeydownHandler);
    }

    taskEditorKeydownHandler = (event) => {
        if (!taskEditor) return;
        const key = event.key;
        if (key !== "Backspace" && key !== "Delete" && key !== "Enter") return;

        const handled = removeOrExitTaskItem(key);
        if (!handled) return;

        event.preventDefault();
        event.stopPropagation();
    };

    taskEditorElement.addEventListener("keydown", taskEditorKeydownHandler);
}

function unbindTaskEditorKeydownHandler() {
    if (!taskEditorElement || !taskEditorKeydownHandler) return;
    taskEditorElement.removeEventListener("keydown", taskEditorKeydownHandler);
    taskEditorKeydownHandler = null;
}

// Convert previous custom checklist markup to TipTap taskList format.
function convertLegacyChecklistHtml(html) {
    const raw = normalizeInputHtml(html);
    if (!raw || typeof document === "undefined") return raw;

    const hasLegacyCbItem = raw.includes("class=\"cb-item\"");
    const hasLegacyCheckboxRow = raw.includes("checkbox-row");
    if (!hasLegacyCbItem && !hasLegacyCheckboxRow) {
        return raw;
    }

    const container = document.createElement("div");
    container.innerHTML = raw;

    const legacyNodes = Array.from(container.querySelectorAll(".cb-item, .checkbox-row"));
    legacyNodes.forEach((node) => {
        const isLegacyRow = node.classList.contains("checkbox-row");
        const isChecked = isLegacyRow
            ? !!node.querySelector(".checkbox-toggle.checked, .checkbox-toggle[aria-pressed=\"true\"]")
            : node.getAttribute("data-checked") === "true";

        let textHtml = "";
        if (isLegacyRow) {
            const textNode = node.querySelector(".check-text");
            textHtml = textNode ? textNode.innerHTML : "";
        } else {
            textHtml = node.innerHTML;
        }

        const list = document.createElement("ul");
        list.setAttribute("data-type", "taskList");

        const item = document.createElement("li");
        item.setAttribute("data-type", "taskItem");
        item.setAttribute("data-checked", isChecked ? "true" : "false");

        const paragraph = document.createElement("p");
        const cleaned = (textHtml || "").trim();
        paragraph.innerHTML = cleaned.length > 0 ? cleaned : "<br>";

        item.appendChild(paragraph);
        list.appendChild(item);
        node.replaceWith(list);
    });

    // Merge adjacent task lists created from legacy checkbox rows.
    const lists = Array.from(container.querySelectorAll('ul[data-type="taskList"]'));
    lists.forEach((list) => {
        let next = list.nextElementSibling;
        while (next && next.matches('ul[data-type="taskList"]')) {
            while (next.firstElementChild) {
                list.appendChild(next.firstElementChild);
            }
            const toRemove = next;
            next = next.nextElementSibling;
            toRemove.remove();
        }
    });

    return container.innerHTML;
}

function getEditorElement() {
    if (taskEditorElement) return taskEditorElement;
    if (typeof document === "undefined") return null;
    taskEditorElement = document.querySelector("#task-description-editor");
    return taskEditorElement;
}

function getHiddenFieldElement() {
    if (taskEditorHiddenField) return taskEditorHiddenField;
    if (typeof document === "undefined") return null;
    taskEditorHiddenField = document.querySelector("#task-description-hidden");
    return taskEditorHiddenField;
}

function getEditorRootClassName(editorElement) {
    const classTokens = (editorElement?.className || "")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .filter((token) => token !== "tiptap" && !token.startsWith("ProseMirror"));

    if (!classTokens.includes("editor-content")) {
        classTokens.push("editor-content");
    }

    return classTokens.join(" ");
}

export function initializeTaskDescriptionEditor({
    editorSelector = "#task-description-editor",
    hiddenSelector = "#task-description-hidden",
    placeholder = "",
    onFocus = null,
    onBlur = null,
    onUpdate = null
} = {}) {
    if (typeof document === "undefined") return null;

    const editorElement = typeof editorSelector === "string"
        ? document.querySelector(editorSelector)
        : editorSelector;
    const hiddenField = typeof hiddenSelector === "string"
        ? document.querySelector(hiddenSelector)
        : hiddenSelector;

    if (!editorElement) return null;

    taskEditorHooks = {
        onFocus: typeof onFocus === "function" ? onFocus : null,
        onBlur: typeof onBlur === "function" ? onBlur : null,
        onUpdate: typeof onUpdate === "function" ? onUpdate : null
    };

    taskEditorElement = editorElement;
    taskEditorHiddenField = hiddenField || null;
    const editorRootId = editorElement.id || "task-description-editor";
    const editorRootClass = getEditorRootClassName(editorElement);

    if (taskEditor && taskEditorElement === editorElement) {
        syncHiddenField(taskEditor.getHTML());
        return taskEditor;
    }

    if (taskEditor) {
        unbindTaskEditorKeydownHandler();
        taskEditor.destroy();
        taskEditor = null;
    }

    taskEditor = new Editor({
        element: editorElement,
        editorProps: {
            attributes: {
                id: editorRootId,
                class: editorRootClass
            }
        },
        extensions: [
            StarterKit,
            Underline,
            TaskList,
            TaskItem.configure({ nested: false }),
            Link.configure({
                autolink: true,
                linkOnPaste: true,
                openOnClick: true,
                HTMLAttributes: {
                    target: "_blank",
                    rel: "noopener noreferrer"
                }
            }),
            Placeholder.configure({
                placeholder
            })
        ],
        content: convertLegacyChecklistHtml(editorElement.innerHTML || ""),
        onCreate: ({ editor }) => {
            const html = normalizeOutputHtml(editor.getHTML());
            syncHiddenField(html);
            if (taskEditorHooks.onUpdate) taskEditorHooks.onUpdate(html);
        },
        onUpdate: ({ editor }) => {
            const html = normalizeOutputHtml(editor.getHTML());
            syncHiddenField(html);
            if (taskEditorHooks.onUpdate) taskEditorHooks.onUpdate(html);
        },
        onFocus: ({ editor }) => {
            if (!taskEditorHooks.onFocus) return;
            taskEditorHooks.onFocus(normalizeOutputHtml(editor.getHTML()));
        },
        onBlur: ({ editor }) => {
            if (!taskEditorHooks.onBlur) return;
            taskEditorHooks.onBlur(normalizeOutputHtml(editor.getHTML()));
        }
    });

    bindTaskEditorKeydownHandler();

    return taskEditor;
}

export function focusTaskDescriptionEditor() {
    if (!taskEditor) return false;
    return taskEditor.commands.focus();
}

export function getTaskDescriptionHTML() {
    if (taskEditor) {
        return normalizeOutputHtml(taskEditor.getHTML());
    }

    const editorElement = getEditorElement();
    if (!editorElement) return "";
    return normalizeOutputHtml(editorElement.innerHTML);
}

export function setTaskDescriptionHTML(html = "") {
    const normalized = convertLegacyChecklistHtml(normalizeInputHtml(html));

    if (taskEditor) {
        taskEditor.commands.setContent(normalized, { emitUpdate: false });
        syncHiddenField(taskEditor.getHTML());
        return;
    }

    const editorElement = getEditorElement();
    if (editorElement) {
        editorElement.innerHTML = normalized;
    }

    const hiddenField = getHiddenFieldElement();
    if (hiddenField) {
        hiddenField.value = normalizeOutputHtml(normalized);
    }
}

export function clearTaskDescriptionEditor() {
    setTaskDescriptionHTML("");
}

export function runTaskDescriptionCommand(command) {
    if (!taskEditor) return false;

    switch (command) {
        case "bold":
            return taskEditor.chain().focus().toggleBold().run();
        case "italic":
            return taskEditor.chain().focus().toggleItalic().run();
        case "underline":
            return taskEditor.chain().focus().toggleUnderline().run();
        case "strikeThrough":
            return taskEditor.chain().focus().toggleStrike().run();
        case "insertUnorderedList":
            return taskEditor.chain().focus().toggleBulletList().run();
        case "insertOrderedList":
            return taskEditor.chain().focus().toggleOrderedList().run();
        default:
            return false;
    }
}

export function insertTaskDescriptionHeading(level) {
    if (!taskEditor) return false;
    const headingLevel = Number.parseInt(String(level).replace("h", ""), 10);
    if (!Number.isFinite(headingLevel) || headingLevel < 1 || headingLevel > 3) {
        return false;
    }
    return taskEditor.chain().focus().toggleHeading({ level: headingLevel }).run();
}

export function insertTaskDescriptionDivider() {
    if (!taskEditor) return false;
    return taskEditor.chain().focus().setHorizontalRule().run();
}

export function insertTaskDescriptionChecklist() {
    if (!taskEditor) return false;
    if (taskEditor.isActive("taskItem") || taskEditor.isActive("taskList")) {
        const lifted = taskEditor.chain().focus().liftListItem("taskItem").run();
        if (lifted) return true;
    }
    return taskEditor.chain().focus().toggleTaskList().run();
}
