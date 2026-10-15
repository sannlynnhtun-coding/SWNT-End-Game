import { ChatBubbleIcon, ReaderIcon } from '@radix-ui/react-icons'

export default function GameModeArt({ mode }) {
  return <span className={`mode-art mode-art-${mode}`} aria-hidden="true">
    {mode === 'english' ? <><span className="letter-tile tile-a">A</span><span className="letter-tile tile-z">Z</span></> : mode === 'slang' ? <><span className="art-bubble bubble-back"><ChatBubbleIcon /></span><span className="art-bubble bubble-front"><ChatBubbleIcon /><span>•••</span></span></> : <><span className="art-book"><ReaderIcon /></span><span className="art-leaf leaf-left" /><span className="art-leaf leaf-right" /></>}
    <svg className="art-spark" viewBox="0 0 24 24"><path d="m12 1 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="currentColor" /></svg>
  </span>
}
