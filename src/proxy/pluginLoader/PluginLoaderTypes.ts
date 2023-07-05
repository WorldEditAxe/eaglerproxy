export namespace PluginLoaderTypes {
  /**
   * ## SemVer
   * Abstract typing to define a semantic version string. Refer to https://semver.org/ for more details.
   */
  export type SemVer = string;

  /**
   * ## SemVerReq
   * Abstract typing to define a semantic version requirement. Refer to https://semver.org/ for more details.
   */
  export type SemVerReq = string;

  /**
   * ## PluginMetadata
   * Data structure of the JSON plugin metadata stored in `metadata.json`. Below is an example plugin metadata object.
   * @example
   * {
   *    name: "ExamplePlugin",
   *    version: "1.0.0"
   * }
   *
   * @property {string} name - The name of the plugin. Spaces are allowed, and this will be shown to the end user.
   * @property {string} id - The internal ID of the plugin. Spaces are not allowed, and any ID conflicts will cause the proxy to not load.
   * @property {PluginLoaderTypes.SemVer} version - The version of the plugin. Must follow SemVer guidelines.
   * @property {string} entry_point - Reference to the entry point JS file of the plugin. Is relative to the file of the `metadata.json`.
   * @property {PluginLoaderTypes.PluginRequirement[]} requirements - The plugin requirement(s) of the plugin. Proxy will not load if any requirement cannot be satisfied.
   * @property {string[]} load_after - Defines what plugin(s) to be loaded first before this plugin is loaded.
   */
  export type PluginMetadata = {
    name: string;
    id: string;
    version: SemVer;
    entry_point: string;
    requirements: PluginRequirement[];
    incompatibilities: PluginRequirement[];
    load_after: string[];
  };

  /**
   * ## PluginMetadataPathed
   * Internal typing. Provides a path to the plugin metadata file.
   */
  export type PluginMetadataPathed = PluginMetadata & { path: string };

  /**
   * ## PluginLoadOrder
   * Internal typing. Provides a loading order for plugin loading.
   */
  export type PluginLoadOrder = string[];

  /**
   * ## PluginRequirement
   * A plugin requirement used to define dependencies for a specific plugin.
   * Semantic versions may be used for the attribute `version`, and you can
   * use `eaglerproxy` to define a requirement for the proxy version.
   * @example
   * {
   *    id: "eaglerproxy"
   * }
   * @property {string} id - The ID of the plugin to be used as a requirement.
   * @property {PluginLoaderTypes.SemVerReq} version - The SemVer requirement for the requirement.
   */
  export type PluginRequirement = {
    id: string;
    version: SemVerReq | "any";
  };
}
