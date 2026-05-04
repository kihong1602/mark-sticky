import { type FC, useRef } from "react";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

interface Props { defaultValue: string; onChange: (md: string) => void; }

const Inner: FC<Props> = ({ defaultValue, onChange }) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEditor((root) => {
    const crepe = new Crepe({ root, defaultValue });
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, md, prev) => {
        if (md !== prev) onChangeRef.current(md);
      });
    });
    return crepe;
  }, []);

  return <Milkdown />;
};

export const MilkdownEditor: FC<Props> = (props) => (
  <MilkdownProvider><Inner {...props} /></MilkdownProvider>
);
