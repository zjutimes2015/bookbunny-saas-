'use client';

import { useState } from 'react';

/**
 * Multi-Character Manager Component
 * Migrated from BookBunny/components/MultiCharacterManager.tsx
 * Adapted to use bunny-* CSS classes instead of apple-*
 */

interface Character {
  id: string;
  name: string;
  photoPreview?: string;
  refSeed?: number;
}

interface MultiCharacterManagerProps {
  characters: Character[];
  onAdd: (name: string, photo?: File) => void;
  onRemove: (id: string) => void;
  onUpdate?: (id: string, data: Partial<Character>) => void;
  maxCharacters?: number;
}

export function MultiCharacterManager({
  characters,
  onAdd,
  onRemove,
  maxCharacters = 5,
}: MultiCharacterManagerProps) {
  const [newName, setNewName] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    const name = file.name.split('.')[0];

    // Create a temporary character placeholder
    const tempId = `char_${Date.now()}`;
    onAdd(name);
    setUploadingId(tempId);

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('name', name);

      const res = await fetch('/api/create-character', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.imageB64) {
        const photoPreview = `data:image/png;base64,${data.imageB64}`;
        onUpdate?.(tempId, {
          name: data.name,
          photoPreview,
          refSeed: data.refSeed,
        });
      } else {
        console.warn('create-character warning:', data.error);
      }
    } catch (err) {
      console.error('create-character error:', err);
    } finally {
      setUploadingId(null);
    }
  };

  const handleAdd = () => {
    if (!newName.trim() || characters.length >= maxCharacters) return;
    onAdd(newName.trim());
    setNewName('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#2D2D2D] dark:text-white">
          Characters ({characters.length}/{maxCharacters})
        </h3>
        <span className="text-xs text-[#8E8E93]">
          Add up to {maxCharacters} characters
        </span>
      </div>

      {/* Character list */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {characters.map((char) => (
          <div className="bunny-card group relative p-3 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF5EE] text-xl">
              {uploadingId === char.id ? (
                <span className="animate-pulse text-sm">✨</span>
              ) : char.photoPreview ? (
                <img
                  src={char.photoPreview}
                  alt={char.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                '🐰'
              )}
            </div>
            <p className="truncate text-xs font-medium text-[#2D2D2D] dark:text-white">
              {char.name}
            </p>
            <button
              onClick={() => onRemove(char.id)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6B8A] text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}

        {/* Add button */}
        {characters.length < maxCharacters && (
          <div
            className="bunny-card flex min-h-[90px] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-[#E5E5EA] p-3 transition-colors hover:border-[#FF6B8A]"
            onClick={() => document.getElementById('char-upload')?.click()}
          >
            <span className="text-2xl text-[#C8A2E8]">+</span>
            <span className="mt-1 text-xs text-[#8E8E93]">Add</span>
            <input
              id="char-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileSelect(file);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Quick add by name */}
      {characters.length > 0 && characters.length < maxCharacters && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-[#FF6B8A]">
            + Add by name only
          </summary>
          <div className="mt-2 flex gap-2">
            <input
              className="bunny-input py-2 text-sm"
              placeholder="Character name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              className="bunny-btn-secondary whitespace-nowrap px-4 py-2 text-sm"
              onClick={handleAdd}
              disabled={!newName.trim()}
            >
              Add
            </button>
          </div>
        </details>
      )}
    </div>
  );
}

export default MultiCharacterManager;
