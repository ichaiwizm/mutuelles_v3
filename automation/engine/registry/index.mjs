import { CommandRegistry } from '../commands/CommandRegistry.mjs'
import { SleepCommand } from '../commands/utility/SleepCommand.mjs'
import { CommentCommand } from '../commands/utility/CommentCommand.mjs'
import { GotoCommand } from '../commands/navigation/GotoCommand.mjs'
import { WaitForFieldCommand } from '../commands/navigation/WaitForFieldCommand.mjs'
import { WaitNetworkIdleCommand } from '../commands/navigation/WaitNetworkIdleCommand.mjs'
import { PressKeyCommand } from '../commands/interaction/PressKeyCommand.mjs'
import { ScrollIntoViewCommand } from '../commands/interaction/ScrollIntoViewCommand.mjs'
import { AcceptConsentCommand } from '../commands/interaction/AcceptConsentCommand.mjs'
import { EnterFrameCommand } from '../commands/frames/EnterFrameCommand.mjs'
import { ExitFrameCommand } from '../commands/frames/ExitFrameCommand.mjs'
import { FillFieldCommand } from '../commands/forms/FillFieldCommand.mjs'
import { TypeFieldCommand } from '../commands/forms/TypeFieldCommand.mjs'
import { ToggleFieldCommand } from '../commands/forms/ToggleFieldCommand.mjs'
import { SelectFieldCommand } from '../commands/forms/SelectFieldCommand.mjs'
import { ClickFieldCommand } from '../commands/forms/ClickFieldCommand.mjs'

export function buildDefaultRegistry(context) {
  const registry = new CommandRegistry()
  registry.register('sleep', new SleepCommand(context))
  registry.register('comment', new CommentCommand(context))
  registry.register('goto', new GotoCommand(context))
  registry.register('waitForField', new WaitForFieldCommand(context))
  registry.register('waitForNetworkIdle', new WaitNetworkIdleCommand(context))
  registry.register('pressKey', new PressKeyCommand(context))
  registry.register('scrollIntoView', new ScrollIntoViewCommand(context))
  registry.register('acceptConsent', new AcceptConsentCommand(context))
  registry.register('enterFrame', new EnterFrameCommand(context))
  registry.register('exitFrame', new ExitFrameCommand(context))
  registry.register('fillField', new FillFieldCommand(context))
  registry.register('typeField', new TypeFieldCommand(context))
  registry.register('toggleField', new ToggleFieldCommand(context))
  registry.register('selectField', new SelectFieldCommand(context))
  registry.register('clickField', new ClickFieldCommand(context))
  return registry
}

