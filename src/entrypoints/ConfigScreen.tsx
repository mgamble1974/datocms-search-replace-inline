import React, { useState } from 'react';
import { RenderConfigScreenCtx } from 'datocms-plugin-sdk';
import { Canvas, Button, TextField } from 'datocms-react-ui';

type Props = { ctx: RenderConfigScreenCtx };

export default function ConfigScreen({ ctx }: Props) {
  const params = ctx.plugin.attributes.parameters as { apiToken?: string };
  const [apiToken, setApiToken] = useState(params.apiToken ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!apiToken.trim()) return;
    setSaving(true);
    await ctx.updatePluginParameters({ apiToken: apiToken.trim() });
    await ctx.notice('API token opgeslagen.');
    setSaving(false);
  };

  return (
    <Canvas ctx={ctx}>
      <div style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600 }}>Instellingen — Zoeken & Vervangen</h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
            Voer een DatoCMS API token in met lees- en schrijfrechten op content.
            Te vinden via <strong>Settings → API Tokens</strong> in DatoCMS.
          </p>
        </div>

        <TextField
          id="apiToken"
          name="apiToken"
          label="DatoCMS API Token"
          value={apiToken}
          onChange={setApiToken}
          placeholder="Plak hier je API token..."
          hint={params.apiToken ? '✓ Token is geconfigureerd' : 'Nog geen token ingesteld'}
        />

        <div>
          <Button
            onClick={handleSave}
            disabled={!apiToken.trim() || saving}
            buttonType="primary"
          >
            {saving ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </div>
    </Canvas>
  );
}
