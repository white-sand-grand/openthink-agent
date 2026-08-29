import * as React from 'react';
import { useState } from 'react';
import { Box, Text, useInput } from '../ink.js';
import { useExitOnCtrlCDWithKeybindings } from '../hooks/useExitOnCtrlCDWithKeybindings.js';
import { getInitialSettings } from '../utils/settings/settings.js';
import {
  PROVIDER_TEMPLATES,
  activateProvider,
  deactivateProvider,
  deleteProvider,
  detectProviderProtocol,
  fetchProviderModels,
  getActiveProviderId,
  getProviderEntry,
  isProviderActive,
  listProviders,
  slugifyProviderName,
  upsertProvider,
  type ProviderEntry,
  type ProviderProtocol,
} from '../utils/model/apiProviders.js';
import {
  MODEL_SLOTS,
  getSlotConfig,
  getSlotProviderId,
  getSlotSupportsVision,
  setSlotConfig,
  type SlotId,
} from '../utils/model/slots.js';
import { getProviderKey, maskKey, providerKeysPath } from '../utils/model/providerKeys.js';
import { ConfigurableShortcutHint } from './ConfigurableShortcutHint.js';
import { Select } from './CustomSelect/index.js';
import TextInput from './TextInput.js';
import { Byline } from './design-system/Byline.js';
import { KeyboardShortcutHint } from './design-system/KeyboardShortcutHint.js';
import { Pane } from './design-system/Pane.js';
import { useSetAppState } from '../state/AppState.js';

const ADD_PROVIDER = '__add_provider__';
const RESTORE_DEFAULT = '__restore_default__';
const ADD_MODEL_MANUAL = '__add_model_manual__';
const FETCH_MODELS = '__fetch_models__';
const DONE_ADDING = '__done_adding__';
const EDIT_KEY = '__edit_key__';
const EDIT_URL = '__edit_url__';
const DELETE_PROVIDER = '__delete_provider__';
const CUSTOM_TEMPLATE = '__custom_template__';
const SLOT_ASSIGN = '__slot_assign__';

type View = {
  type: 'list'
} | {
  type: 'entry'
  id: string
} | {
  type: 'add'
} | {
  type: 'baseUrl'
  draft: ProviderEntry
  id: string
} | {
  type: 'key'
  draft: ProviderEntry
  id: string
} | {
  type: 'models'
  draft: ProviderEntry
  id: string
  fetched: string[] | null
} | {
  type: 'modelInput'
  draft: ProviderEntry
  id: string
  fetched: string[] | null
} | {
  type: 'mainModel'
  draft: ProviderEntry
  id: string
} | {
  type: 'confirmDelete'
  id: string
} | {
  type: 'slotList'
} | {
  type: 'slotEdit'
  slot: SlotId
} | {
  type: 'slotModel'
  slot: SlotId
  manual?: boolean
} | {
  type: 'slotProvider'
  slot: SlotId
};

export type ProviderPickerProps = {
  /** Called when the user leaves the top screen without a switch. */
  onBack: () => void;
  /** Called after a provider was activated and a default model was chosen. */
  onPicked: (modelId: string) => void;
  /** Render as a top-level dialog (Pane + exit hints), e.g. for /provider. */
  standalone?: boolean;
};

/**
 * cc-switch-style provider manager for the TUI: providers are fully
 * user-defined (base URL + protocol + API key + user-managed model list —
 * typed in or fetched from the endpoint's /v1/models). No models are
 * hardcoded anywhere. API keys live in the dedicated local key store.
 */
export function ProviderPicker({ onBack, onPicked, standalone }: ProviderPickerProps): React.ReactNode {
  const setAppState = useSetAppState();
  const exitState = useExitOnCtrlCDWithKeybindings();
  const [view, setView] = useState<View>({
    type: 'list'
  });
  const [inputValue, setInputValue] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const activeId = getActiveProviderId();

  function syncSettingsState(): void {
    setAppState(prev => ({
      ...prev,
      settings: getInitialSettings(),
    }));
  }

  function finishActivation(id: string, modelId: string): void {
    activateProvider(id);
    syncSettingsState();
    onPicked(modelId);
  }

  // Esc with an empty input goes back (first Esc on a non-empty input clears
  // it instead — same double-press semantics as the rest of the app).
  useInput((_value, key) => {
    if (!key.escape) return;
    if (inputValue !== '') return;
    if (busy) return;
    if (view.type === 'list') {
      onBack();
    } else if (view.type === 'slotEdit' || view.type === 'slotModel' || view.type === 'slotProvider') {
      setView({
        type: 'slotList'
      });
    } else if (view.type === 'slotList') {
      setView({
        type: 'list'
      });
    } else if (view.type !== 'entry') {
      setView({
        type: 'list'
      });
    }
  });

  async function startModelFetch(draft: ProviderEntry, id: string, keyOverride?: string): Promise<void> {
    setBusy(true);
    setStatus('正在从端点抓取模型列表…');
    let protocol = draft.protocol;
    if (protocol === 'auto') {
      setStatus('正在探测端点协议(Anthropic / OpenAI)…');
      const detected = await detectProviderProtocol(draft.baseUrl, keyOverride ?? getProviderKey(id) ?? '');
      protocol = detected ?? 'anthropic';
      setStatus(detected ? `已识别协议: ${detected === 'anthropic' ? 'Anthropic' : 'OpenAI 兼容'}` : '协议探测失败,按 Anthropic 处理');
    }
    const result = await fetchProviderModels(draft.baseUrl, keyOverride ?? getProviderKey(id) ?? '', protocol as ProviderProtocol);
    setBusy(false);
    setStatus(null);
    const mergedDraft: ProviderEntry = { ...draft, protocol: protocol as ProviderProtocol | 'auto', detectedProtocol: protocol === 'auto' ? undefined : protocol as ProviderProtocol };
    setView({
      type: 'models',
      draft: mergedDraft,
      id,
      fetched: result.models.length > 0 ? result.models : null
    });
    if (result.error) {
      setStatus(`抓取失败: ${result.error}`);
    }
  }

  let content: React.ReactNode;
  if (view.type === 'list') {
    const entries = listProviders();
    const options = [];
    if (activeId) {
      options.push({
        value: RESTORE_DEFAULT,
        label: 'Anthropic 官方 API(恢复默认)',
        description: '停用第三方提供商,回到 api.anthropic.com',
      });
    }
    for (const item of entries) {
      const keyHint = item.hasKey ? ` · Key ${maskKey(getProviderKey(item.id) ?? '')}` : ' · 未配置 Key';
      options.push({
        value: item.id,
        label: `${item.active ? '✓ ' : ''}${item.entry.name}${item.entry.models.length > 0 ? `(${item.entry.models.length} 个模型)` : ''}`,
        description: item.entry.baseUrl + keyHint,
      });
    }
    options.push({
      value: SLOT_ASSIGN,
      label: '槽位分配(Architect · Artisan · Seer · Clerk)…',
      description: '为四个角色槽分别绑定提供商与模型;未配置的槽回落默认模型链',
    });
    options.push({
      value: ADD_PROVIDER,
      label: '＋ 添加提供商…',
      description: '选模板或完全自定义:Base URL + API Key + 模型列表(自动识别 Anthropic / OpenAI 协议)',
    });
    content = <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold>API 提供商</Text>
          <Text dimColor>第三方提供商完全自定义:端点 + 协议(自动识别 Anthropic/OpenAI)+ API Key(仅存本机)+ 自行添加模型。切换立即生效。</Text>
        </Box>
        <Select defaultValue={options[0]?.value} options={options} onChange={value => {
        if (value === SLOT_ASSIGN) {
          setView({
            type: 'slotList'
          });
          return;
        }
        if (value === ADD_PROVIDER) {
          setView({
            type: 'add'
          });
          return;
        }
        if (value === RESTORE_DEFAULT) {
          deactivateProvider();
          syncSettingsState();
          onBack();
          return;
        }
        setView({
          type: 'entry',
          id: value
        });
      }} onCancel={onBack} visibleOptionCount={Math.min(12, options.length)} />
        {status && <Box paddingLeft={2}>
            <Text dimColor>{busy ? '⏳ ' : ''}{status}</Text>
          </Box>}
      </Box>;
  } else if (view.type === 'add') {
    const options = PROVIDER_TEMPLATES.map(t => ({
      value: `template:${t.id}`,
      label: t.name,
      description: `${t.baseUrl}${t.notes ? ` · ${t.notes}` : ''}`,
    }));
    options.push({
      value: CUSTOM_TEMPLATE,
      label: '完全自定义端点…',
      description: '任意 Anthropic / OpenAI 兼容网关,协议自动识别',
    });
    content = <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold>添加提供商</Text>
          <Text dimColor>模板只提供端点地址;模型列表稍后自行添加或从端点抓取。</Text>
        </Box>
        <Select defaultValue={options[0]?.value} options={options} onChange={value => {
        if (value === CUSTOM_TEMPLATE) {
          setInputValue('https://');
          setView({
            type: 'baseUrl',
            id: '',
            draft: {
              name: '',
              baseUrl: '',
              protocol: 'auto',
              models: [],
              createdAt: Date.now()
            }
          });
          return;
        }
        const templateId = value.slice('template:'.length);
        const template = PROVIDER_TEMPLATES.find(t => t.id === templateId);
        if (!template) return;
        const id = slugifyProviderName(template.id);
        setInputValue(template.baseUrl);
        setView({
          type: 'baseUrl',
          id,
          draft: {
            name: template.name,
            baseUrl: template.baseUrl,
            protocol: 'auto',
            models: [],
            websiteUrl: template.websiteUrl,
            notes: template.notes,
            createdAt: Date.now()
          }
        });
      }} onCancel={() => setView({
        type: 'list'
      })} visibleOptionCount={Math.min(12, options.length)} />
      </Box>;
  } else if (view.type === 'baseUrl') {
    content = <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold>提供商 Base URL</Text>
          <Text dimColor>Anthropic 兼容(…/anthropic)或 OpenAI 兼容(…/v1)均可,保存时自动识别协议。回车继续。</Text>
        </Box>
        <TextInput focus placeholder="https://…" value={inputValue} onChange={setInputValue} onSubmit={async () => {
        const baseUrl = inputValue.trim().replace(/\/+$/, '');
        if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
          setStatus('URL 需以 http(s):// 开头');
          return;
        }
        const draft: ProviderEntry = { ...view.draft, baseUrl };
        const name = view.draft.name || hostNameOf(baseUrl);
        const id = view.id || slugifyProviderName(name);
        setBusy(true);
        setStatus('正在探测端点协议…');
        const detected = await detectProviderProtocol(baseUrl, getProviderKey(id) ?? '');
        setBusy(false);
        setStatus(detected ? `已识别协议: ${detected === 'anthropic' ? 'Anthropic' : 'OpenAI 兼容'}` : '未能识别协议(可稍后手动指定),先继续配置 Key');
        setInputValue(getProviderKey(id) ?? '');
        setView({
          type: 'key',
          id,
          draft: { ...draft, name, detectedProtocol: detected ?? undefined }
        });
      }} />
        {status && <Box paddingLeft={2}>
            <Text dimColor>{busy ? '⏳ ' : ''}{status}</Text>
          </Box>}
      </Box>;
  } else if (view.type === 'key') {
    const stored = getProviderKey(view.id);
    content = <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold>{view.draft.name || '提供商'} · API Key</Text>
          <Text dimColor>粘贴 API Key 后回车。Key 仅保存在本机密钥文件({getKeysHint()}),不会写入项目或 settings.json。空输入回车{stored ? `沿用已存 Key(${maskKey(stored)})` : '返回'}。</Text>
        </Box>
        <TextInput focus mask="*" placeholder={stored ? `已存: ${maskKey(stored)} — 直接回车沿用` : '粘贴 API Key…'} value={inputValue} onChange={setInputValue} onSubmit={async () => {
        const key = inputValue.trim();
        if (!key && !stored) return;
        const finalKey = key || stored || '';
        if (key) {
          upsertProvider(view.id, view.draft, key);
        } else {
          upsertProvider(view.id, view.draft);
        }
        await startModelFetch(view.draft, view.id, finalKey);
      }} />
        {status && <Box paddingLeft={2}>
            <Text dimColor>{busy ? '⏳ ' : ''}{status}</Text>
          </Box>}
      </Box>;
  } else if (view.type === 'models') {
    const existing = view.draft.models;
    const fetched = view.fetched ?? [];
    const options = [];
    // Union so hand-typed models that the endpoint no longer lists stay
    // manageable here.
    const source = [...new Set([...fetched, ...existing])];
    for (const modelId of source) {
      const added = existing.includes(modelId);
      options.push({
        value: `model:${modelId}`,
        label: `${added ? '✓ ' : '＋ '}${modelId}`,
        description: added ? '已添加 — 回车移除' : '回车添加到该提供商',
      });
    }
    options.push({
      value: ADD_MODEL_MANUAL,
      label: '＋ 手动输入模型 ID…',
      description: '端点没列出来时手动填写',
    });
    options.push({
      value: FETCH_MODELS,
      label: '↻ 重新抓取模型列表',
      description: `GET ${view.draft.baseUrl} 的 /v1/models`,
    });
    if (existing.length > 0) {
      options.push({
        value: DONE_ADDING,
        label: `完成 — 保存提供商(${existing.length} 个模型)并选择默认模型`,
        description: existing.join(', '),
      });
    }
    content = <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold>{view.draft.name} · 模型列表(自行添加)</Text>
          <Text dimColor>{fetched.length > 0 ? '从端点 /v1/models 抓取到以下模型,回车添加/移除:' : '端点未返回列表 — 手动输入模型 ID(可多次添加):'}</Text>
        </Box>
        <Select defaultValue={options[0]?.value} options={options} onChange={value => {
        if (value.startsWith('model:')) {
          const modelId = value.slice('model:'.length);
          const models = existing.includes(modelId) ? existing.filter(m => m !== modelId) : [...existing, modelId];
          setView({
            type: 'models',
            draft: { ...view.draft, models },
            id: view.id,
            fetched: view.fetched
          });
          return;
        }
        if (value === ADD_MODEL_MANUAL) {
          setInputValue('');
          setView({
            type: 'modelInput',
            draft: view.draft,
            id: view.id,
            fetched: view.fetched
          });
          return;
        }
        if (value === FETCH_MODELS) {
          void startModelFetch({ ...view.draft, models: existing }, view.id);
          return;
        }
        if (value === DONE_ADDING) {
          upsertProvider(view.id, view.draft);
          setView({
            type: 'mainModel',
            draft: view.draft,
            id: view.id
          });
        }
      }} onCancel={() => setView({
        type: 'list'
      })} visibleOptionCount={Math.min(12, options.length)} />
        {status && <Box paddingLeft={2}>
            <Text dimColor>{busy ? '⏳ ' : ''}{status}</Text>
          </Box>}
      </Box>;
  } else if (view.type === 'modelInput') {
    content = <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold>添加模型 ID</Text>
          <Text dimColor>输入该端点的模型 ID(如 gpt-4o / glm-4.6 / a-model),回车添加;留空回车返回。</Text>
        </Box>
        <TextInput focus placeholder="model-id…" value={inputValue} onChange={setInputValue} onSubmit={() => {
        const modelId = inputValue.trim();
        if (!modelId) {
          setView({
            type: 'models',
            draft: view.draft,
            id: view.id,
            fetched: view.fetched
          });
          return;
        }
        const models = view.draft.models.includes(modelId) ? view.draft.models : [...view.draft.models, modelId];
        setInputValue('');
        setView({
          type: 'models',
          draft: { ...view.draft, models },
          id: view.id,
          fetched: view.fetched
        });
      }} />
      </Box>;
  } else if (view.type === 'mainModel') {
    const options = view.draft.models.map(modelId => ({
      value: modelId,
      label: modelId,
      description: '设为该提供商的默认模型',
    }));
    content = <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold>选择默认模型</Text>
          <Text dimColor>保存后立即切换到 {view.draft.baseUrl} 并使用该模型;之后可随时在 /provider 中更改。后台辅助调用使用第一个模型({view.draft.models[0]})。</Text>
        </Box>
        <Select defaultValue={options[0]?.value} options={options} onChange={modelId => {
        upsertProvider(view.id, view.draft);
        finishActivation(view.id, modelId);
      }} onCancel={() => setView({
        type: 'models',
        draft: view.draft,
        id: view.id,
        fetched: null
      })} visibleOptionCount={Math.min(12, options.length)} />
      </Box>;
  } else if (view.type === 'slotList') {
    const options = MODEL_SLOTS.map(def => {
      const cfg = getSlotConfig(def.id);
      const providerId = getSlotProviderId(def.id);
      const providerName = providerId ? (getProviderEntry(providerId)?.name ?? providerId) : '跟随激活提供商';
      return {
        value: def.id,
        label: `${def.name} · ${def.label}`,
        description: cfg?.model ? `${cfg.model} @ ${providerName}${getSlotSupportsVision(def.id) ? ' · 视觉' : ''}` : `未配置 — 回落默认模型链 · ${def.description}`,
      };
    });
    content = <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold={true}>槽位分配</Text>
          <Text dimColor={true}>四个角色槽各自绑定提供商与模型;未配置的槽自动回落默认模型链。默认分工:plan 模式走 Architect,主循环走 Artisan,图片转述走 Seer,后台辅助调用走 Clerk。</Text>
        </Box>
        <Select defaultValue={options[0]?.value} options={options} onChange={slot => {
        setView({
          type: 'slotEdit',
          slot
        });
      }} onCancel={() => setView({
        type: 'list'
      })} visibleOptionCount={options.length} />
      </Box>;
  } else if (view.type === 'slotEdit') {
    const def = MODEL_SLOTS.find(s => s.id === view.slot)!;
    const cfg = getSlotConfig(view.slot);
    const providerId = getSlotProviderId(view.slot);
    const providerName = providerId ? (getProviderEntry(providerId)?.name ?? providerId) : '跟随激活提供商';
    content = <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold={true}>{def.name} · {def.label}</Text>
          <Text dimColor={true}>{def.description}</Text>
        </Box>
        <Select defaultValue="model" options={[{
        value: 'model',
        label: `模型: ${cfg?.model ?? '未配置(回落默认)'}`,
        description: '设置该槽使用的模型 ID',
      }, {
        value: 'provider',
        label: `提供商: ${providerName}`,
        description: '绑定到某个已添加的提供商;不绑定则跟随当前激活提供商',
      }, {
        value: 'vision',
        label: `视觉声明: ${getSlotSupportsVision(view.slot) ? '开(该槽模型可接收图片)' : '关'}`,
        description: '声明该槽模型具备视觉能力;主循环模型未声明时图片会转由 Seer 槽转述',
      }, {
        value: 'clear',
        label: '清除该槽配置',
        description: '恢复回落默认模型链',
      }]} onChange={value => {
        const current = getSlotConfig(view.slot) ?? {};
        if (value === 'model') {
          setInputValue('');
          setView({
            type: 'slotModel',
            slot: view.slot
          });
          return;
        }
        if (value === 'provider') {
          setView({
            type: 'slotProvider',
            slot: view.slot
          });
          return;
        }
        if (value === 'vision') {
          setSlotConfig(view.slot, { ...current, supportsVision: !(getSlotSupportsVision(view.slot)) });
          syncSettingsState();
          return;
        }
        if (value === 'clear') {
          setSlotConfig(view.slot, {});
          syncSettingsState();
        }
      }} onCancel={() => setView({
        type: 'slotList'
      })} />
      </Box>;
  } else if (view.type === 'slotModel') {
    const providerId = getSlotProviderId(view.slot);
    const entry = providerId ? getProviderEntry(providerId) : undefined;
    const models = entry?.models ?? [];

    if (view.manual || models.length === 0) {
      content = <Box flexDirection="column">
          <Box marginBottom={1} flexDirection="column">
            <Text color="remember" bold={true}>输入 {view.slot} 槽模型 ID</Text>
            <Text dimColor={true}>{entry ? `来自提供商 ${entry.name};` : '该槽未绑定提供商 — 输入模型 ID,跟随当前激活提供商。'}回车保存,留空返回。</Text>
          </Box>
          <TextInput focus={true} placeholder="model-id…" value={inputValue} onChange={setInputValue} onSubmit={() => {
          const modelId = inputValue.trim();
          if (!modelId) {
            setView({
              type: 'slotEdit',
              slot: view.slot
            });
            return;
          }
          setSlotConfig(view.slot, { ...getSlotConfig(view.slot), model: modelId });
          syncSettingsState();
          setView({
            type: 'slotList'
          });
        }} />
        </Box>;
    } else {
      const options = models.map(modelId => ({
        value: `m:${modelId}`,
        label: modelId,
        description: entry?.name ?? '',
      }));
      options.push({
        value: 'm:__manual__',
        label: '＋ 手动输入模型 ID…',
        description: '列表里没有时直接填写',
      });
      content = <Box flexDirection="column">
          <Box marginBottom={1} flexDirection="column">
            <Text color="remember" bold={true}>选择 {view.slot} 槽模型</Text>
            <Text dimColor={true}>来自提供商 {entry!.name}</Text>
          </Box>
          <Select defaultValue={options[0]?.value} options={options} onChange={value => {
          if (value === 'm:__manual__') {
            setInputValue('');
            setView({
              type: 'slotModel',
              slot: view.slot,
              manual: true
            });
            return;
          }
          const modelId = value.slice(2);
          setSlotConfig(view.slot, { ...getSlotConfig(view.slot), model: modelId });
          syncSettingsState();
          setView({
            type: 'slotList'
          });
        }} onCancel={() => setView({
          type: 'slotEdit',
          slot: view.slot
        })} visibleOptionCount={Math.min(12, options.length)} />
        </Box>;
    }
  } else if (view.type === 'slotProvider') {
    const entries = listProviders();
    const options = [{
      value: 'p:__follow__',
      label: '跟随当前激活提供商',
      description: '不单独绑定;激活哪家用哪家',
    }];
    for (const item of entries) {
      options.push({
        value: `p:${item.id}`,
        label: item.entry.name,
        description: item.entry.baseUrl,
      });
    }
    content = <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold={true}>{MODEL_SLOTS.find(s => s.id === view.slot)!.name} · 绑定提供商</Text>
          <Text dimColor={true}>绑定后,该槽的请求走指定提供商(需要该提供商已配置 API Key)。</Text>
        </Box>
        <Select defaultValue={options[0]?.value} options={options} onChange={value => {
        const providerId = value === 'p:__follow__' ? undefined : value.slice(2);
        setSlotConfig(view.slot, { ...getSlotConfig(view.slot), provider: providerId });
        syncSettingsState();
        setView({
          type: 'slotEdit',
          slot: view.slot
        });
      }} onCancel={() => setView({
        type: 'slotEdit',
        slot: view.slot
      })} visibleOptionCount={Math.min(12, options.length)} />
      </Box>;
  } else {
    // entry: manage an existing provider
    const entry = getProviderEntry(view.id);
    if (!entry) {
      setView({
        type: 'list'
      });
      content = null;
    } else {
      const stored = getProviderKey(view.id);
      const isActive = isProviderActive(view.id);
      const options = entry.models.map(modelId => ({
        value: `use:${modelId}`,
        label: modelId,
        description: isActive && entry.models.length > 0 ? '切换到此模型' : '保存并切换到此模型(需先配置 Key)',
      }));
      options.push({
        value: ADD_MODEL_MANUAL,
        label: '＋ 添加模型 ID…',
        description: '手动加入该提供商的模型列表',
      });
      options.push({
        value: FETCH_MODELS,
        label: '↻ 从端点抓取模型列表…',
        description: `GET ${entry.baseUrl} 的 /v1/models,抓到后逐个添加`,
      });
      options.push({
        value: EDIT_KEY,
        label: stored ? `编辑 API Key(当前 ${maskKey(stored)})…` : '配置 API Key…',
        description: '保存在本机密钥文件',
      });
      options.push({
        value: EDIT_URL,
        label: '编辑 Base URL…',
        description: entry.baseUrl,
      });
      options.push({
        value: DELETE_PROVIDER,
        label: '删除该提供商…',
        description: '同时删除已存的 Key',
      });
      content = <Box flexDirection="column">
          <Box marginBottom={1} flexDirection="column">
            <Text color="remember" bold>{entry.name}{isActive ? '  ✓ 当前使用' : ''}</Text>
            <Text dimColor>{entry.baseUrl} · 协议: {entry.protocol === 'auto' ? entry.detectedProtocol ?? '待识别' : entry.protocol}</Text>
          </Box>
          <Select defaultValue={options[0]?.value} options={options} onChange={value => {
          if (value.startsWith('use:')) {
            const modelId = value.slice('use:'.length);
            if (!getProviderKey(view.id)) {
              setStatus('该提供商还没有配置 API Key — 先选择「配置 API Key…」');
              return;
            }
            upsertProvider(view.id, entry);
            finishActivation(view.id, modelId);
            return;
          }
          if (value === ADD_MODEL_MANUAL) {
            setInputValue('');
            setView({
              type: 'modelInput',
              draft: entry,
              id: view.id,
              fetched: null
            });
            return;
          }
          if (value === FETCH_MODELS) {
            if (!stored) {
              setStatus('请先配置 API Key');
              return;
            }
            void startModelFetch(entry, view.id);
            return;
          }
          if (value === EDIT_KEY) {
            setInputValue('');
            setView({
              type: 'key',
              id: view.id,
              draft: entry
            });
            return;
          }
          if (value === EDIT_URL) {
            setInputValue(entry.baseUrl);
            setView({
              type: 'baseUrl',
              id: view.id,
              draft: entry
            });
            return;
          }
          if (value === DELETE_PROVIDER) {
            setView({
              type: 'confirmDelete',
              id: view.id
            });
          }
        }} onCancel={onBack} visibleOptionCount={Math.min(12, options.length)} />
          {status && <Box paddingLeft={2}>
              <Text dimColor>{busy ? '⏳ ' : ''}{status}</Text>
            </Box>}
        </Box>;
    }
  }

  // confirmDelete is a tiny select-based view layered over the entry view.
  if (view.type === 'confirmDelete') {
    const entry = getProviderEntry(view.id);
    content = <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold>删除提供商 {entry?.name ?? view.id}?</Text>
          <Text dimColor>同时删除本机存储的 API Key。此操作不可撤销。</Text>
        </Box>
        <Select defaultValue="no" options={[{
        value: 'no',
        label: '取消',
        description: '返回'
      }, {
        value: 'yes',
        label: '确认删除',
        description: '删除提供商与 Key'
      }]} onChange={value => {
        if (value === 'yes') {
          deleteProvider(view.id);
          syncSettingsState();
        }
        setView({
          type: 'list'
        });
      }} onCancel={() => setView({
        type: 'list'
      })} />
      </Box>;
  }

  const byline = <Byline>
      <KeyboardShortcutHint shortcut="Enter" action="confirm" />
      <ConfigurableShortcutHint action="select:cancel" context="Select" fallback="Esc" description={view.type === 'list' ? 'back' : 'back/cancel'} />
    </Byline>;

  if (!standalone) {
    return content;
  }
  return <Pane color="permission">
      {content}
      <Text dimColor italic>{exitState.pending ? <>Press {exitState.keyName} again to exit</> : byline}</Text>
    </Pane>;
}

function hostNameOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function getKeysHint(): string {
  return providerKeysPath();
}

/** Label for the model picker's entry point into this dialog. */
export function getProviderPickerEntryLabel(): string {
  const activeId = getActiveProviderId();
  if (!activeId) return '更多提供商 / 切换接口… (GLM · Kimi · DeepSeek · Qwen · 自定义)';
  const entry = getProviderEntry(activeId);
  return `提供商: ${entry?.name ?? activeId}(点击切换)…`;
}
