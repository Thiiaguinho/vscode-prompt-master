# VSCode Prompt Master

**VSCode Prompt Master** is an extension that lets you create and manage prompts for ChatGPT (or other AI models) using selected project files as context—no external app required.

## Features

- **TreeView with simulated checkboxes:** Toggle file and folder selections by clicking on items (e.g., `[x] file.txt`).
- **Multiple selection support:** Keep track of selected files and folders locally.
- **WebView Panel for prompt generation:** Combine content from selected files, custom saved prompts, and a manual prompt into one final text.
- **Direct clipboard copy:** Automatically copy the generated text to your clipboard.

## How to Use

1. **Open a folder** in VSCode (File > Open Folder).
2. **Locate the "Prompt Master" view** in the Explorer sidebar.
3. **Toggle selections:** Click on any file or folder in the TreeView to toggle between `[ ]` and `[x]`. Items marked `[x]` will be included in the final output.
4. **Manage Custom Prompts:**
   - In the WebView panel, navigate to the "Custom Prompts" section.
   - To create or update a prompt, enter a name and content, then click **Save Prompt**.
   - To delete a prompt, select it from the list and click **Delete Selected**.
   - To load multiple custom prompts for editing, hold down **Ctrl** (Windows/Linux) or **Command** (macOS) while selecting, then click **Load into Editor**. The contents will be concatenated into a single editable text area.
5. **Generate and Copy Prompt:**
   - In the WebView, enter your manual prompt (optional).
   - Select any saved custom prompts from the list.
   - Click **Generate & Copy** to combine the content of the selected files, custom prompts, and your manual prompt, and copy the result to your clipboard.
6. **Keyboard Shortcut:** Press `Alt+2` to open the Prompt Master panel directly without using the Command Palette.

## Developing Locally

1. Run `npm install` to install dependencies.
2. Run `npm run compile` to compile the TypeScript files.
3. Open the project in VSCode and press `F5` to launch a new VSCode window with the extension loaded.
4. In the new window, open the Command Palette and search for **Prompt Master** to access the extension commands.

## Packaging and Publishing

- Run `vsce package` to generate the `.vsix` package.
- Run `vsce publish` (if you have an account) to publish the extension to the Marketplace.

## License

[MIT License](https://mit-license.org/)
