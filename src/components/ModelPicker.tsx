import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useExitOnCtrlCDWithKeybindings } from 'src/hooks/useExitOnCtrlCDWithKeybindings.js';
import { Box, Text } from '../ink.js';
import { type ModelSetting, modelDisplayString } from '../utils/model/model.js';
import { getModelOptions } from '../utils/model/modelOptions.js';
import { ConfigurableShortcutHint } from './ConfigurableShortcutHint.js';
import { Select } from './CustomSelect/index.js';
import { ProviderPicker, getProviderPickerEntryLabel } from './ProviderPicker.js';
import { Byline } from './design-system/Byline.js';
import { KeyboardShortcutHint } from './design-system/KeyboardShortcutHint.js';
import { Pane } from './design-system/Pane.js';
export type Props = {
  initial: string | null;
  sessionModel?: ModelSetting;
  onSelect: (model: string | null) => void;
  onCancel?: () => void;
  isStandaloneCommand?: boolean;
  /** Overrides the dim header line below "Select model". */
  headerText?: string;
};
const NO_PREFERENCE = '__NO_PREFERENCE__';
const PROVIDERS_ENTRY = '__providers__';
export function ModelPicker(t0) {
  const {
    initial,
    sessionModel,
    onSelect,
    onCancel,
    isStandaloneCommand,
    headerText
  } = t0;
  const exitState = useExitOnCtrlCDWithKeybindings();
  const initialValue = initial === null ? NO_PREFERENCE : initial;
  const [focusedValue, setFocusedValue] = useState(initialValue);
  const [view, setView] = useState('models');
  const modelOptions = useMemo(() => getModelOptions(), []);

  // Ensure the initial value is in the options list. This handles edge cases
  // where the user's current model (e.g., 'haiku' for 3P users) is not in the
  // base options but should still be selectable and shown as selected.
  const optionsWithInitial = useMemo(() => {
    if (initial !== null && !modelOptions.some(opt => opt.value === initial)) {
      return [...modelOptions, {
        value: initial,
        label: modelDisplayString(initial),
        description: 'Current model'
      }];
    }
    return modelOptions;
  }, [modelOptions, initial]);
  const providerEntry = useMemo(() => ({
    value: PROVIDERS_ENTRY,
    label: getProviderPickerEntryLabel(),
    description: 'Anthropic 兼容端点:切换提供商、配置 API Key、选用其模型'
  }), []);
  const selectOptions = useMemo(() => [...optionsWithInitial.map(opt => ({
    ...opt,
    value: opt.value === null ? NO_PREFERENCE : opt.value
  })), providerEntry], [optionsWithInitial, providerEntry]);
  const initialFocusValue = useMemo(() => selectOptions.some(_ => _.value === initialValue) ? initialValue : selectOptions[0]?.value ?? undefined, [selectOptions, initialValue]);
  const visibleCount = Math.min(10, selectOptions.length);
  const hiddenCount = Math.max(0, selectOptions.length - visibleCount);
  const handleFocus = useCallback((value: string) => {
    setFocusedValue(value);
  }, []);
  function handleSelect(value: string): void {
    if (value === PROVIDERS_ENTRY) {
      setView('providers');
      return;
    }
    if (value === NO_PREFERENCE) {
      onSelect(null);
      return;
    }
    onSelect(value);
  }
  const content = <Box flexDirection="column">
      <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold>Select model</Text>
          <Text dimColor>{headerText ?? 'Switch between Claude models. Applies to this session and future OpenThink sessions. For other/previous model names, specify with --model.'}</Text>
          {sessionModel && <Text dimColor>Currently using {modelDisplayString(sessionModel)} for this session (set by plan mode). Selecting a model will undo this.</Text>}
        </Box>

        {view === 'providers' ? <ProviderPicker onBack={() => setView('models')} onPicked={modelId => {
        setView('models');
        handleSelect(modelId);
      }} /> : <Box flexDirection="column" marginBottom={1}>
            <Box flexDirection="column">
              <Select defaultValue={initialValue} defaultFocusValue={initialFocusValue} options={selectOptions} onChange={handleSelect} onFocus={handleFocus} onCancel={onCancel ?? (() => {})} visibleOptionCount={visibleCount} />
            </Box>
            {hiddenCount > 0 && <Box paddingLeft={3}>
                <Text dimColor>and {hiddenCount} more…</Text>
              </Box>}
          </Box>}

      </Box>

      {isStandaloneCommand && <Text dimColor italic>{exitState.pending ? <>Press {exitState.keyName} again to exit</> : <Byline><KeyboardShortcutHint shortcut="Enter" action="confirm" /><ConfigurableShortcutHint action="select:cancel" context="Select" fallback="Esc" description="exit" /></Byline>}</Text>}
    </Box>;
  if (!isStandaloneCommand) {
    return content;
  }
  return <Pane color="permission">{content}</Pane>;
}
