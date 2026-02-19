import { App, PluginSettingTab, Setting, TFolder, TFile } from "obsidian";
import type NoteCreatorPlugin from "./main";
import type { NoteType } from "./types";
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

export class NoteCreatorSettingTab extends PluginSettingTab {
	plugin: NoteCreatorPlugin;

	constructor(app: App, plugin: NoteCreatorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	override hide(): void {
		this.removeEmptyTemplates();
		super.hide();
	}

	private removeEmptyTemplates(): void {
		const types = this.plugin.settings.types;
		const before = types.length;
		this.plugin.settings.types = types.filter(
			(t) =>
				t.name.trim() !== "" ||
				t.templatePath.trim() !== "" ||
				t.destinationFolder.trim() !== ""
		);
		if (this.plugin.settings.types.length !== before) {
			void this.plugin.saveSettings();
		}
	}

	override display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Templates").setHeading();

		const listContainer = containerEl.createDiv({ cls: "note-type-list" });

		for (let index = 0; index < this.plugin.settings.types.length; index++) {
			const noteType = this.plugin.settings.types[index];
			if (noteType) this.renderTypeEntry(listContainer, noteType, index);
		}

		new Setting(containerEl).addButton((button) => {
			button
				.setButtonText("Add new note template")
				.setCta()
				.onClick(async () => {
					const newType: NoteType = {
						id: generateId(),
						name: "",
						templatePath: "",
						destinationFolder: "",
					};
					this.plugin.settings.types.push(newType);
					await this.plugin.saveSettings();
					this.display();
				});
		});
	}

	private renderTypeEntry(
		containerEl: HTMLElement,
		noteType: NoteType,
		index: number
	): void {
		const s = new Setting(containerEl)
			.addText((cb) => {
				cb.setPlaceholder("Template name")
					.setValue(noteType.name)
					.onChange(async (value) => {
						const t = this.plugin.settings.types[index];
						if (t) t.name = value;
						await this.plugin.saveSettings();
					});
				cb.inputEl.addClass("note-type-search");
			})
			.addSearch((cb) => {
				new FileSuggest(this.app, cb.inputEl);
				cb.setPlaceholder("Template file")
					.setValue(noteType.templatePath)
					.onChange(async (value) => {
						const t = this.plugin.settings.types[index];
						if (t) t.templatePath = value;
						await this.plugin.saveSettings();
					});
				(cb as unknown as { containerEl: HTMLElement }).containerEl.addClass("note-type-search");
			})
			.addSearch((cb) => {
				new FolderSuggest(this.app, cb.inputEl);
				cb.setPlaceholder("Destination folder")
					.setValue(noteType.destinationFolder)
					.onChange(async (value) => {
						const t = this.plugin.settings.types[index];
						if (t) t.destinationFolder = value;
						await this.plugin.saveSettings();
					});
				(cb as unknown as { containerEl: HTMLElement }).containerEl.addClass("note-type-search");
			})
			.addExtraButton((cb) => {
				cb.setIcon("cross")
					.setTooltip("Delete")
					.onClick(async () => {
						this.plugin.settings.types.splice(index, 1);
						await this.plugin.saveSettings();
						this.display();
					});
			});

		s.infoEl.remove();
	}
}
