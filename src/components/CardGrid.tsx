import { type FC } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MemoCard } from "./MemoCard";
import type { MemoFile } from "../types";

interface CardGridProps {
  files: MemoFile[];
  onSelect: (memo: MemoFile) => void;
  onDelete: (memo: MemoFile) => void;
  onRename: (memo: MemoFile, newName: string) => Promise<void>;
  onReorder: (oldIndex: number, newIndex: number) => void;
}

function SortableCard({
  memo,
  onSelect,
  onDelete,
  onRename,
}: {
  memo: MemoFile;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newName: string) => Promise<void>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: memo.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MemoCard
        memo={memo}
        onClick={onSelect}
        onDelete={onDelete}
        onRename={onRename}
      />
    </div>
  );
}

export const CardGrid: FC<CardGridProps> = ({
  files,
  onSelect,
  onDelete,
  onRename,
  onReorder,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  if (files.length === 0) {
    return (
      <div className="card-grid-empty">
        <p>메모가 없습니다</p>
        <p className="text-muted">상단의 + New 버튼으로 새 메모를 만드세요</p>
      </div>
    );
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = files.findIndex((f) => f.name === active.id);
    const newIndex = files.findIndex((f) => f.name === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={files.map((f) => f.name)}
        strategy={rectSortingStrategy}
      >
        <div className="card-grid">
          {files.map((memo) => (
            <SortableCard
              key={memo.name}
              memo={memo}
              onSelect={() => onSelect(memo)}
              onDelete={() => onDelete(memo)}
              onRename={(newName) => onRename(memo, newName)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
