import { App, type ISuggestOwner, Scope } from "obsidian";
import { createPopper, type Instance as PopperInstance } from "@popperjs/core";

function wrapAround(value: number, size: number): number {
	return ((value % size) + size) % size;
}

class Suggest<T> {
	private owner: ISuggestOwner<T>;
	private values: T[] = [];
	private suggestions: HTMLDivElement[] = [];
	private selectedItem = 0;
	private containerEl: HTMLElement;

	constructor(
		owner: ISuggestOwner<T>,
		containerEl: HTMLElement,
		scope: Scope
	) {
		this.owner = owner;
		this.containerEl = containerEl;

		containerEl.on("click", ".suggestion-item", this.onSuggestionClick.bind(this));
		containerEl.on("mousemove", ".suggestion-item", this.onSuggestionMouseover.bind(this));

		scope.register([], "ArrowUp", (event: KeyboardEvent) => {
			if (!event.isComposing) {
				this.setSelectedItem(this.selectedItem - 1, true);
				return false;
			}
			return true;
		});

		scope.register([], "ArrowDown", (event: KeyboardEvent) => {
			if (!event.isComposing) {
				this.setSelectedItem(this.selectedItem + 1, true);
				return false;
			}
			return true;
		});

		scope.register([], "Enter", (event: KeyboardEvent) => {
			if (!event.isComposing) {
				this.useSelectedItem(event);
				return false;
			}
			return true;
		});
	}

	onSuggestionClick(event: MouseEvent, el: HTMLDivElement): void {
		event.preventDefault();
		const item = this.suggestions.indexOf(el);
		this.setSelectedItem(item, false);
		this.useSelectedItem(event);
	}

	onSuggestionMouseover(_event: MouseEvent, el: HTMLDivElement): void {
		const item = this.suggestions.indexOf(el);
		this.setSelectedItem(item, false);
	}

	setSuggestions(values: T[]): void {
		this.containerEl.empty();
		const suggestionEls: HTMLDivElement[] = [];

		for (const value of values) {
			const suggestionEl = this.containerEl.createDiv("suggestion-item");
			this.owner.renderSuggestion(value, suggestionEl);
			suggestionEls.push(suggestionEl);
		}

		this.values = values;
		this.suggestions = suggestionEls;
		this.setSelectedItem(0, false);
	}

	useSelectedItem(event: MouseEvent | KeyboardEvent): void {
		const currentValue = this.values[this.selectedItem];
		if (currentValue != null) {
			this.owner.selectSuggestion(currentValue, event);
		}
	}

	setSelectedItem(selectedIndex: number, scrollIntoView: boolean): void {
		if (this.suggestions.length === 0) return;
		const normalizedIndex = wrapAround(selectedIndex, this.suggestions.length);
		const prev = this.suggestions[this.selectedItem];
		const next = this.suggestions[normalizedIndex];
		prev?.removeClass("is-selected");
		next?.addClass("is-selected");
		this.selectedItem = normalizedIndex;
		if (scrollIntoView && next) {
			next.scrollIntoView(false);
		}
	}
}

export abstract class TextInputSuggest<T> implements ISuggestOwner<T> {
	protected app: App;
	protected inputEl: HTMLInputElement | HTMLTextAreaElement;

	private popper: PopperInstance | null = null;
	private scope: Scope;
	private suggestEl: HTMLElement;
	private suggest: Suggest<T>;

	constructor(app: App, inputEl: HTMLInputElement | HTMLTextAreaElement) {
		this.app = app;
		this.inputEl = inputEl;
		this.scope = new Scope();

		this.suggestEl = createDiv("suggestion-container");
		const suggestion = this.suggestEl.createDiv("suggestion");
		this.suggest = new Suggest<T>(this, suggestion, this.scope);

		this.scope.register([], "Escape", () => this.close());

		this.inputEl.addEventListener("input", () => this.onInputChanged());
		this.inputEl.addEventListener("focus", () => this.onInputChanged());
		this.inputEl.addEventListener("blur", () => this.close());

		this.suggestEl.on("mousedown", ".suggestion-container", (event: MouseEvent) => {
			event.preventDefault();
		});
	}

	private onInputChanged(): void {
		const inputStr = this.inputEl.value;
		const suggestions = this.getSuggestions(inputStr);

		if (!suggestions || suggestions.length === 0) {
			this.close();
			return;
		}

		this.suggest.setSuggestions(suggestions);
		const container = (this.app as { dom?: { appContainerEl: HTMLElement } }).dom?.appContainerEl ?? document.body;
		this.open(container, this.inputEl);
	}

	private open(container: HTMLElement, inputEl: HTMLElement): void {
		this.app.keymap.pushScope(this.scope);
		container.appendChild(this.suggestEl);
		this.popper = createPopper(inputEl, this.suggestEl, {
			placement: "bottom-start",
		});
	}

	close(): void {
		this.app.keymap.popScope(this.scope);
		this.suggest.setSuggestions([]);
		if (this.popper) {
			this.popper.destroy();
			this.popper = null;
		}
		this.suggestEl.detach();
	}

	abstract getSuggestions(inputStr: string): T[];
	abstract renderSuggestion(item: T, el: HTMLElement): void;
	abstract selectSuggestion(item: T, evt: MouseEvent | KeyboardEvent): void;
}
