export interface NoteTemplate {
	id: string;
	name: string;
	templatePath: string;
	destinationFolder: string;
}

export interface NoteTemplaterSettings {
	enableCustomTemplates: boolean;
	templates: NoteTemplate[];
}

export const DEFAULT_SETTINGS: NoteTemplaterSettings = {
	enableCustomTemplates: false,
	templates: [],
};
