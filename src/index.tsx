import { connect, Field } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import FieldAddon from './entrypoints/FieldAddon';
import ConfigScreen from './entrypoints/ConfigScreen';
import 'datocms-react-ui/styles.css';

connect({
  renderConfigScreen(ctx) {
    render(<ConfigScreen ctx={ctx} />);
  },

  manualFieldExtensions() {
    return [
      {
        id: 'searchReplace',
        name: 'Zoeken & vervangen',
        type: 'addon',
        fieldTypes: ['structured_text'],
      },
    ];
  },

  overrideFieldExtensions(field: Field) {
    if (field.attributes.api_key === 'article_content_body') {
      return {
        addons: [{ id: 'searchReplace' }],
      };
    }
  },

  renderFieldExtension(fieldExtensionId, ctx) {
    if (fieldExtensionId === 'searchReplace') {
      render(<FieldAddon ctx={ctx} />);
    }
  },
});
