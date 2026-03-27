import { connect } from 'datocms-plugin-sdk';
import { render } from './utils/render';
import InlinePanel from './entrypoints/InlinePanel';
import ConfigScreen from './entrypoints/ConfigScreen';
import 'datocms-react-ui/styles.css';

connect({
  renderConfigScreen(ctx) {
    render(<ConfigScreen ctx={ctx} />);
  },

  itemFormOutlets() {
    return [
      {
        id: 'searchReplace',
        rank: 1,
      },
    ];
  },

  renderItemFormOutlet(outletId, ctx) {
    if (outletId === 'searchReplace') {
      render(<InlinePanel ctx={ctx} />);
    }
  },
});
