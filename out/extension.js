"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const readJSON = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, data) => {
            try {
                return err ? reject(err) : resolve(JSON.parse(data.toString()));
            }
            catch (err) {
                console.error(err);
                resolve(null);
            }
        });
    });
};
const createShortPropertiesCompletions = (shortProperties) => {
    return shortProperties.map(property => {
        const snippetCompletion = new vscode.CompletionItem(property);
        snippetCompletion.insertText = new vscode.SnippetString(property + "-${0:value}");
        snippetCompletion.documentation = new vscode.MarkdownString(`[**UtilityStyled**] Short property: **${property}**-*value*`);
        return snippetCompletion;
    });
};
const createTemplatesCompletion = (templates) => {
    return templates.map(template => {
        const snippetCompletion = new vscode.CompletionItem(template);
        snippetCompletion.insertText = new vscode.SnippetString(template + "$0");
        snippetCompletion.documentation = new vscode.MarkdownString(`[**UtilityStyled**] Template: **${template}**
			`);
        return snippetCompletion;
    });
};
const loadDefaultConfiguration = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield readJSON(path.resolve(__dirname, "../defaultrc.json"));
});
const loadWorkspaceConfiguration = () => __awaiter(void 0, void 0, void 0, function* () {
    const files = yield vscode.workspace.findFiles("**/utilitystyled.json", "**/node_modules/**");
    const config = {
        templates: [],
        shortProperties: []
    };
    if (!files)
        return config;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const configPerFile = yield readJSON(file.fsPath);
        if (!configPerFile)
            continue;
        if (configPerFile.shortProperties) {
            config.shortProperties = config.shortProperties.concat(configPerFile.shortProperties);
        }
        if (configPerFile.templates) {
            config.templates = config.templates.concat(configPerFile.templates);
        }
    }
    return config;
});
const checkIfInUtilityStyledTemplate = (document, position) => {
    const cursorOffset = document.offsetAt(position);
    const source = ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest, true);
    let template;
    let token = ts.getTokenAtPosition(source, cursorOffset);
    while (token) {
        if (token.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
            token.kind === ts.SyntaxKind.TemplateExpression) {
            template = token;
        }
        token = token.parent;
    }
    if (template) {
        const templateStart = document.positionAt(template.pos);
        const templateStartTag = document.getText(new vscode.Range(templateStart.translate(0, -2), templateStart));
        if (templateStartTag == "us") {
            return true;
        }
    }
    return false;
};
const createCompletionSubscription = (context, defaultCompletions) => {
    return vscode.languages.registerCompletionItemProvider(["javascript", "javascriptreact", "typescript", "typescriptreact"], {
        provideCompletionItems(document, position) {
            return __awaiter(this, void 0, void 0, function* () {
                const userConfiguration = vscode.workspace.getConfiguration("utilitystyled");
                const autoCompleteEnabled = userConfiguration.get("autocomplete");
                if (!autoCompleteEnabled)
                    return null;
                if (!checkIfInUtilityStyledTemplate(document, position)) {
                    return null;
                }
                let workspaceShortProperties = [];
                let workspaceTemplates = [];
                const workspaceConfiguration = yield loadWorkspaceConfiguration();
                if (workspaceConfiguration) {
                    if (workspaceConfiguration.shortProperties) {
                        workspaceShortProperties = createShortPropertiesCompletions(workspaceConfiguration.shortProperties);
                    }
                    if (workspaceConfiguration.templates) {
                        workspaceTemplates = createTemplatesCompletion(workspaceConfiguration.templates);
                    }
                }
                if (workspaceShortProperties.length > 0 ||
                    workspaceTemplates.length > 0) {
                    return [
                        ...defaultCompletions,
                        ...workspaceTemplates,
                        ...workspaceShortProperties
                    ];
                }
                return defaultCompletions;
            });
        }
    });
};
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const configuration = yield loadDefaultConfiguration();
        const defaultShortPropertiesCompletions = createShortPropertiesCompletions(configuration.shortProperties || []);
        const defaultTemplatesCompletions = createTemplatesCompletion(configuration.templates || []);
        const defaultCompletions = [
            ...defaultTemplatesCompletions,
            ...defaultShortPropertiesCompletions
        ];
        const completionSubscription = createCompletionSubscription(context, defaultCompletions);
        context.subscriptions.push(completionSubscription);
    });
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map