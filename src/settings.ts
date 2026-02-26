import { App, PluginSettingTab, Setting, TFolder, TFile } from "obsidian";
import type NoteTemplaterPlugin from "./main";
import type { NoteTemplate } from "./types";
import { TextInputSuggest } from "./suggest";

class FileSuggest extends TextInputSuggest<TFile> {
	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
	}

	getSuggestions(query: string): TFile[] {
		const files = this.app.vault.getMarkdownFiles();
		const lowerQuery = query.toLowerCase();
		return files
			.filter((file) => file.path.toLowerCase().includes(lowerQuery))
			.slice(0, 20);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
		this.inputEl.value = file.path;
		this.inputEl.trigger("input");
		this.close();
	}
}

class FolderSuggest extends TextInputSuggest<TFolder> {
	constructor(app: App, inputEl: HTMLInputElement) {
		super(app, inputEl);
	}

	getSuggestions(query: string): TFolder[] {
		const folders: TFolder[] = [];
		const lowerQuery = query.toLowerCase();
		const rootFolder = this.app.vault.getRoot();
		this.collectFolders(rootFolder, folders);
		return folders
			.filter((folder) => folder.path.toLowerCase().includes(lowerQuery))
			.slice(0, 20);
	}

	private collectFolders(folder: TFolder, result: TFolder[]): void {
		for (const child of folder.children) {
			if (child instanceof TFolder) {
				result.push(child);
				this.collectFolders(child, result);
			}
		}
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}

	selectSuggestion(folder: TFolder, _evt: MouseEvent | KeyboardEvent): void {
		this.inputEl.value = folder.path;
		this.inputEl.trigger("input");
		this.close();
	}
}

function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export class NoteTemplaterSettingTab extends PluginSettingTab {
	plugin: NoteTemplaterPlugin;

	constructor(app: App, plugin: NoteTemplaterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	override hide(): void {
		this.removeEmptyTemplates();
		super.hide();
	}

	private removeEmptyTemplates(): void {
		const templates = this.plugin.settings.templates;
		const before = templates.length;
		this.plugin.settings.templates = templates.filter(
			(t) =>
				t.name.trim() !== "" ||
				t.templatePath.trim() !== "" ||
				t.destinationFolder.trim() !== ""
		);
		if (this.plugin.settings.templates.length !== before) {
			void this.plugin.saveSettings();
		}
	}

	override display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Settings").setHeading();

		const settingsList = containerEl.createDiv({ cls: "note-settings-list" });

		new Setting(settingsList)
			.setName("Custom templates")
			.setDesc(
				"Select custom templates when creating a new note, choose custom properties and property types."
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableCustomTemplates)
					.onChange(async (value) => {
						this.plugin.settings.enableCustomTemplates = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("Templates").setHeading();

		const listContainer = containerEl.createDiv({ cls: "note-type-list" });

		for (let index = 0; index < this.plugin.settings.templates.length; index++) {
			const template = this.plugin.settings.templates[index];
			if (template) this.renderTemplateEntry(listContainer, template, index);
		}

		new Setting(containerEl).addButton((button) => {
			button
				.setButtonText("Add new note template")
				.setCta()
				.onClick(async () => {
					const newTemplate: NoteTemplate = {
						id: generateId(),
						name: "",
						templatePath: "",
						destinationFolder: "",
					};
					this.plugin.settings.templates.push(newTemplate);
					await this.plugin.saveSettings();
					this.display();
				});
		});
	}

	private renderTemplateEntry(
		containerEl: HTMLElement,
		template: NoteTemplate,
		index: number
	): void {
		const s = new Setting(containerEl)
			.addText((cb) => {
				cb.setPlaceholder("Template name")
					.setValue(template.name)
					.onChange(async (value) => {
						const t = this.plugin.settings.templates[index];
						if (t) t.name = value;
						await this.plugin.saveSettings();
					});
				cb.inputEl.addClass("note-type-search", "note-type-name");
			})
			.addSearch((cb) => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder("Template file")
					.setValue(template.templatePath)
					.onChange(async (value) => {
						const t = this.plugin.settings.templates[index];
						if (t) t.templatePath = value;
						await this.plugin.saveSettings();
					});
				(cb as unknown as { containerEl: HTMLElement }).containerEl.addClass("note-type-search", "note-type-path");
			})
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder("Destination folder")
					.setValue(template.destinationFolder)
					.onChange(async (value) => {
						const t = this.plugin.settings.templates[index];
						if (t) t.destinationFolder = value;
						await this.plugin.saveSettings();
					});
				(cb as unknown as { containerEl: HTMLElement }).containerEl.addClass("note-type-search", "note-type-path");
			})
			.addExtraButton((cb) => {
				cb.setIcon("up-chevron-glyph")
					.setTooltip("Move up")
					.onClick(async () => {
						if (index <= 0) return;
						const templates = this.plugin.settings.templates;
						[templates[index - 1], templates[index]] = [templates[index]!, templates[index - 1]!];
						await this.plugin.saveSettings();
						this.display();
					});
			})
			.addExtraButton((cb) => {
				cb.setIcon("down-chevron-glyph")
					.setTooltip("Move down")
					.onClick(async () => {
						const templates = this.plugin.settings.templates;
						if (index >= templates.length - 1) return;
						[templates[index], templates[index + 1]] = [templates[index + 1]!, templates[index]!];
						await this.plugin.saveSettings();
						this.display();
					});
			})
			.addExtraButton((cb) => {
				cb.setIcon("cross")
					.setTooltip("Delete")
					.onClick(async () => {
						this.plugin.settings.templates.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					});
			});

		s.infoEl.remove();
	}
}
