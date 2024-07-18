
import 'tinymce/tinymce';
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/content/default/content.min.css';
import 'tinymce/icons/default/icons';
import 'tinymce/themes/silver/theme';
import 'tinymce/models/dom/model';
import tinymce from 'tinymce';

const promptTemplateTextArea = document.querySelector<HTMLTextAreaElement>('#prompt_template')!;

(async () => {
    let builtInsession: AITextSession | null = null;
    if (window.ai && await window.ai.canCreateTextSession() === 'readily') {
        builtInsession = await window.ai.createTextSession();
    }

    const editors = (await tinymce.init({
        selector: '#smarteditor',
        content_style: '.suggestion { opacity: 30% }'
    }));

    const editor = editors[0];
    let lastRequestId = 0;

    async function getSuggestion(content: string): Promise<string> {
        let prompt = promptTemplateTextArea.value.replace('${CONTENT}', content);
        performance.mark('suggestionMark');
        let result = await builtInsession?.prompt(prompt) as string;
        console.log(performance.measure('suggestionMeasure', 'suggestionMark'));
        console.log(prompt, '->', result);
        if (result.startsWith(content)) {
            result = result.substring(content.length);
        }
        return result;
    }

    let timeout: number | undefined = undefined;
    async function handleInput() {
        lastRequestId++;
        let currentId = lastRequestId;
        window.clearTimeout(timeout);
        editor.contentDocument.querySelector('.suggestion')?.remove();
        timeout = window.setTimeout(async () => {
            let content = editor.getContent({format: 'text'});
            let suggestion = await getSuggestion(content);
            if (currentId !== lastRequestId) {
                console.log(`currentId (${currentId}) doesnt match lastRequestId (${lastRequestId})`);
                return;
            }
            editor.insertContent("<span class=\"suggestion\">" + suggestion + "</span>");
        }, 150);
    }

    editor.on('input', handleInput);

    editor.on('keydown', (e) => {
        let suggestion = editor.contentDocument.querySelector('.suggestion');
        if (suggestion && e.key == 'Tab') {
            e.preventDefault();
            suggestion?.classList.remove('suggestion');
            // let content = suggestion.textContent;
            // if (content) {
            //     editor.insertContent(content);
            // }
            handleInput();
            return;
        }
        if (suggestion) {
            suggestion.remove();
        }
    });
})();