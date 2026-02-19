export interface NoteType {
	id: string;
	name: string;
	templatePath: string;
	destinationFolder: string;
}

export interface NoteCreatorSettings {
	types: NoteType[];
}

export const DEFAULT_SETTINGS: NoteCreatorSettings = {
	types: [],
};
