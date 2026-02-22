import { Plugin, Platform, setIcon } from "obsidian";
import type { NoteCreatorSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { NoteCreatorSettingTab } from "./settings";
import { NoteCreatorModal } from "./modal";

export default class NoteCreatorPlugin extends Plugin {
	settings: NoteCreatorSettings = { ...DEFAULT_SETTINGS };
	private sidebarButtonEl: HTMLElement | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.app.workspace.onLayoutReady(() => {
			this.addSidebarButton();
		});

		this.addCommand({
			id: "open-quasar-templater",
			name: "Create new note",
			callback: () => {
				new NoteCreatorModal(this.app, this).open();
			},
		});

		this.addSettingTab(new NoteCreatorSettingTab(this.app, this));
	}

	onunload(): void {
		this.sidebarButtonEl?.remove();
	}

	private addSidebarButton(): void {
		if (!Platform.isDesktopApp) return;

		const leftSplit = (this.app.workspace as WorkspaceWithLeftSplit).leftSplit;
		if (!leftSplit?.containerEl) return;

		const tabContainer = leftSplit.containerEl.querySelector(
			".workspace-tab-header-container"
		);
		if (!tabContainer) return;

		const tabHeader = createDiv({
			cls: "workspace-tab-header note-creator-tab",
			attr: { "aria-label": "Note", "data-tooltip-position": "right" },
		});
		const inner = tabHeader.createDiv({ cls: "workspace-tab-header-inner" });
		const iconEl = inner.createDiv({ cls: "workspace-tab-header-inner-icon" });
		setIcon(iconEl, "sticky-note");

		tabHeader.addEventListener("click", () => {
			new NoteCreatorModal(this.app, this).open();
		});

		tabContainer.appendChild(tabHeader);
		this.sidebarButtonEl = tabHeader;
	}

	async loadSettings(): Promise<void> {
		const data = await this.loadData();
		this.settings = { ...DEFAULT_SETTINGS, ...data };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

interface WorkspaceWithLeftSplit {
	leftSplit?: { containerEl?: HTMLElement };
}
