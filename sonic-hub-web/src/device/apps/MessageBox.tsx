/* The system's message box: what a shortcut says when the program behind it is no longer on the machine. */
import { useWm } from '../pc/wm';
import { useWin } from '../pc/Window';

export function MessageBox({ text }: { text: string }) {
  const win = useWin();
  const { close } = useWm();
  return (
    <div className="dv-box">
      <div className="dv-box-main">
        <svg className="dv-box-icon" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 3l14 25H2z" fill="#f5c400" stroke="#9a7800" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M16 11v9" stroke="#222" strokeWidth="2.6" strokeLinecap="round" /><circle cx="16" cy="24" r="1.6" fill="#222" />
        </svg>
        <p>{text}</p>
      </div>
      <div className="dv-box-btns"><button type="button" autoFocus onClick={() => win && close(win.id)}>OK</button></div>
    </div>
  );
}
