import { PolymerElement } from "@polymer/polymer/polymer-element.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { afterNextRender } from "@polymer/polymer/lib/utils/render-status.js";

import "@NadeemShakya/polymerfire/firebase-auth.js";
import "@NadeemShakya/polymerfire/firestore-query.js";
import "@NadeemShakya/polymerfire/firestore-document";

import "@aspen-elements/paper-chip/paper-chip-input-autocomplete.js";

/**
 * `firefly-fs-tags` This component displays a list of tags. An autocomplete component gives the user
 * a list of suggested tags. A firebase query makes use of the 'suggested-values-path', to get a list
 * of suggestions.  When the user makes a selection, the selection is stored in two places:
 *  - in a model node (i.e. 'model.tags')
 *  - as subnodes of the 'selected-values-path' (i.e. /tags-companies/{tagId}/{companyObject}),
 *    this makes it possible to easily query all companies that have a specific tag
 *
 * @summary This component displays a list of tags.
 * @customElement
 * @polymer
 * @extends {PolymerElement}
 */
class FireflyTags extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
        }
      </style>

      <firebase-auth app-name="[[appName]]"></firebase-auth>

      <fs-query
        id="suggestionsQuery"
        app-name="[[appName]]"
        path="[[suggestedValuesPath]]"
        order-by-value=""
        data="{{data}}"
        start-at="[[start]]"
        on-data-changed="__handleDataChanged"
        limit-to-first="5"
        log=""
      ></fs-query>

      <fs-query
        id="selectionsQuery"
        app-name="[[appName]]"
        path="[[selectedValuesPath]]"
      ></fs-query>

      <paper-chip-input-autocomplete
        closable=""
        additional-items=""
        label="[[label]]"
        items="{{__tags}}"
        source="[[__suggestions]]"
        pattern="{{start}}"
      ></paper-chip-input-autocomplete>
    `;
  }

  /**
   * String providing the tag name to register the element under.
   */
  static get is() {
    return "firefly-fs-tags";
  }

  /**
   * Object describing property-related metadata used by Polymer features
   */
  static get properties() {
    return {
      /** The name of the firebase application. */
      appName: {
        type: String,
        value: "",
      },

      /** The label for the field. */
      label: {
        type: String,
        value: "",
      },

      /** The query path used to retrieve the suggestions. */
      suggestedValuesPath: {
        type: String,
        value: "",
      },

      /**
       * An Array<String> of suggested tags based on the value entered
       * by the user in the autocomplete field.
       */
      __suggestions: {
        type: Array,
        value: [],
      },

      /** An Array<String> of values selected by the user. */
      tags: {
        type: Array,
        value: [],
        observer: "__tagsInitialized",
      },

      /**
       * The key to the map where the suggested tag is created.
       */
      key: {
        type: String,
        value: "",
      },

      __tags: {
        type: Array,
        value: [],
      },

      /** The query path used to save selected values. */
      selectedValuesPath: {
        type: String,
        value: "",
      },
      /** This is the tags data from the db. */
      data: {
        type: Object,
        value: "",
      },

      __deleted: {
        type: Boolean,
        value: false,
      },

      selectedValuesNodePath: {
        type: String,
        value: "",
      },

      navigate: {
        type: Boolean,
        value: false,
      },
      navigateTo: {
        type: String,
        value: "",
      },
    };
  }

  __handleDataChanged(e) {
    let data = e.detail.value;
    let suggestions = [];
    for (let item of data) {
      suggestions.push({ text: item[this.key], value: item[this.key] });
    }

    this.__suggestions = [...suggestions];
  }

  __tagsInitialized(tags) {
    if (tags && Array.isArray(tags) && tags.length > 0) {
      this.set("__tags", tags);
    } else {
      this.set("__tags", []);
    }
  }

  __computeSaveTag(createTag) {
    if (createTag === "false") {
      return false;
    }
    return true;
  }

  __launch(e) {
    if (!this.__deleted && this.navigate) {
      const chipTray = this.shadowRoot.querySelector(
        "paper-chip-input-autocomplete"
      );

      const navigationTo = this.navigateTo;
      try {
        const key = this.data.find((elem) => elem.name === e.detail.tag).$key;
        window.open(`/${navigationTo}/${key}`, "_blank");
      } catch (e) {
        window.open(`/${navigationTo}`, "_blank");
      }
    }
    this.set("__deleted", false);
  }
  /**
   * Instance of the element is created/upgraded. Use: initializing state,
   * set up event listeners, create shadow dom.
   * @constructor
   */
  constructor() {
    super();
  }

  /**
   * Use for one-time configuration of your component after local DOM is initialized.
   */
  ready() {
    super.ready();

    afterNextRender(this, function () {});
  }

  /**
   * This method is triggered whenever a tag is added to the field. If the tag is not in
   * the __suggestions field, then it will be added to the /tags node.
   * @param {Event} e the event object
   */
  async __handleChipCreated(e) {
    e.stopPropagation();
    let path = this.selectedValuesPath;

    let tag = e.detail.chipLabel;
    if (this.__suggestions.every((suggestion) => suggestion.text !== tag)) {
      let key = this.key;
      let tagObject = {};
      tagObject[key] = tag;

      let tagExists = await this.$.selectionsQuery.ref
        .where(key, "==", tag)
        .get();
      if (tagExists.empty) {
        this.$.selectionsQuery.ref.doc().set(tagObject, { merge: true });
      } else {
        console.log("tag already Exits");
      }

      this.dispatchEvent(
        new CustomEvent("tag-added", {
          bubbles: true,
          composed: true,
          detail: {
            tags: tag,
            path: path,
          },
        })
      );
    }
  }

  /**
   * This method is triggered whenever a tag is removed from the field.
   * @param {Event} e the event object
   */
  __handleChipDeleted(e) {
    this.set("__deleted", true);
    let path = this.selectedValuesPath;
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent("tag-removed", {
        bubbles: true,
        composed: true,
        detail: {
          tags: e.detail,
          path: path,
        },
      })
    );
  }

  /**
   * Called every time the element is inserted into the DOM. Useful for
   * running setup code, such as fetching resources or rendering.
   * Generally, you should try to delay work until this time.
   */
  connectedCallback() {
    super.connectedCallback();

    let chipTray = this.shadowRoot.querySelector(
      "paper-chip-input-autocomplete"
    );
    chipTray.addEventListener("chip-created", (e) =>
      this.__handleChipCreated(e)
    );
    chipTray.addEventListener("chip-removed", (e) =>
      this.__handleChipDeleted(e)
    );
    chipTray.addEventListener("tag-clicked", (e) => this.__launch(e));
  }

  /**
   * Called every time the element is removed from the DOM. Useful for
   * running clean up code (removing event listeners, etc.).
   */
  disconnectedCallback() {
    super.disconnectedCallback();

    let chipTray = this.shadowRoot.querySelector(
      "paper-chip-input-autocomplete"
    );
    chipTray.removeEventListener("chip-created", (e) =>
      this.__handleChipCreated(e)
    );
    chipTray.removeEventListener("chip-removed", (e) =>
      this.__handleChipDeleted(e)
    );
    chipTray.removeEventListener("tag-clicked", (e) => this.__launch(e.tag));
  }
}

window.customElements.define(FireflyTags.is, FireflyTags);
