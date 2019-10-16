import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

interface IConfig {
	shortProperties?: string[];
	templates?: string[];
}

const readJSON = (filePath: string): Promise<IConfig | null> => {
	return new Promise<IConfig | null>((resolve, reject) => {
		fs.readFile(filePath, (err, data) => {
			try {
				return err ? reject(err) : resolve(JSON.parse(data.toString()));
			} catch (err) {
				console.error(err);
				resolve(null);
			}
		});
	});
};

const createShortPropertiesCompletions = (shortProperties: string[]) => {
	return shortProperties.map(property => {
		const snippetCompletion = new vscode.CompletionItem(property);
		snippetCompletion.insertText = new vscode.SnippetString(
			property + "-${0:value}"
		);
		snippetCompletion.documentation = new vscode.MarkdownString(
			`[**UtilityStyled**] Short property: **${property}**-*value*`
		);
		return snippetCompletion;
	});
};

const createTemplatesCompletion = (templates: string[]) => {
	return templates.map(template => {
		const snippetCompletion = new vscode.CompletionItem(template);
		snippetCompletion.insertText = new vscode.SnippetString(
			template + "$0"
		);
		snippetCompletion.documentation = new vscode.MarkdownString(
			`[**UtilityStyled**] Template: **${template}**
			`
		);
		return snippetCompletion;
	});
};

const loadDefaultConfiguration = async () => {
	return await readJSON(path.resolve(__dirname, "../defaultrc.json"));
};

const loadWorkspaceConfiguration = async () => {
	const files = await vscode.workspace.findFiles(
		"**/utilitystyled.json",
		"**/node_modules/**"
	);
	const config = {
		templates: [],
		shortProperties: []
	};
	if (!files) return config;
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const configPerFile = await readJSON(file.fsPath);
		if (!configPerFile) continue;
		if (configPerFile.shortProperties) {
			config.shortProperties = config.shortProperties.concat(
				configPerFile.shortProperties
			);
		}
		if (configPerFile.templates) {
			config.templates = config.templates.concat(configPerFile.templates);
		}
	}
	return config;
};

const checkIfInUtilityStyledTemplate = (
	document: vscode.TextDocument,
	position: vscode.Position
) => {
	const cursorOffset = document.offsetAt(position);
	const source = ts.createSourceFile(
		document.fileName,
		document.getText(),
		ts.ScriptTarget.Latest,
		true
	);
	let template: ts.TemplateLiteral | undefined;
	let token = (ts as any).getTokenAtPosition(source, cursorOffset);
	while (token) {
		if (
			token.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
			token.kind === ts.SyntaxKind.TemplateExpression
		) {
			template = token;
		}
		token = token.parent;
	}
	if (template) {
		const templateStart = document.positionAt(template.pos);
		const templateStartTag = document.getText(
			new vscode.Range(templateStart.translate(0, -2), templateStart)
		);
		if (templateStartTag == "us") {
			return true;
		}
	}
	return false;
};

const createCompletionSubscription = (
	context: vscode.ExtensionContext,
	defaultCompletions: vscode.CompletionItem[]
) => {
	return vscode.languages.registerCompletionItemProvider(
		["javascript", "javascriptreact", "typescript", "typescriptreact"],
		{
			async provideCompletionItems(
				document: vscode.TextDocument,
				position: vscode.Position
			) {
				const userConfiguration = vscode.workspace.getConfiguration(
					"utilitystyled"
				);
				const autoCompleteEnabled = userConfiguration.get(
					"autocomplete"
				);
				if (!autoCompleteEnabled) return null;
				if (!checkIfInUtilityStyledTemplate(document, position)) {
					return null;
				}
				let workspaceShortProperties: vscode.CompletionItem[] = [];
				let workspaceTemplates: vscode.CompletionItem[] = [];
				const workspaceConfiguration = await loadWorkspaceConfiguration();
				if (workspaceConfiguration) {
					if (workspaceConfiguration.shortProperties) {
						workspaceShortProperties = createShortPropertiesCompletions(
							workspaceConfiguration.shortProperties
						);
					}
					if (workspaceConfiguration.templates) {
						workspaceTemplates = createTemplatesCompletion(
							workspaceConfiguration.templates
						);
					}
				}
				if (
					workspaceShortProperties.length > 0 ||
					workspaceTemplates.length > 0
				) {
					return [
						...defaultCompletions,
						...workspaceTemplates,
						...workspaceShortProperties
					];
				}
				return defaultCompletions;
			}
		}
	);
};

export async function activate(context: vscode.ExtensionContext) {
	const configuration = await loadDefaultConfiguration();
	const defaultShortPropertiesCompletions = createShortPropertiesCompletions(
		configuration.shortProperties || []
	);
	const defaultTemplatesCompletions = createTemplatesCompletion(
		configuration.templates || []
	);
	const defaultCompletions = [
		...defaultTemplatesCompletions,
		...defaultShortPropertiesCompletions
	];

	const completionSubscription = createCompletionSubscription(
		context,
		defaultCompletions
	);

	context.subscriptions.push(completionSubscription);
}
