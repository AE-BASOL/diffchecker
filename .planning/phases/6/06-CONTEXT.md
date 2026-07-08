# Phase 6: Undo/Redo Engine - Context

**Gathered:** 2026-07-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement a global Undo/Redo engine that tracks text changes across both `originalInput` and `modifiedInput`. It intercepts Ctrl+Z and Ctrl+Y (or Ctrl+Shift+Z) to prevent the browser's native undo stack and applies our custom history.

</domain>

<decisions>
## Implementation Decisions

### Undo/Redo Stack Davranışı
- Stack kapasitesi: Sınırsız
- Sıfırlanma: Clear, Sample, ve Swap eylemlerinde stack sıfırlanır
- Çakışma: `event.preventDefault()` ile tarayıcının yerel Undo/Redo özelliği devredışı bırakılarak kendi stack'imiz devreye alınır

### History Capture & Execution
- Snapshot zamanlaması: Her 'input' eventinde çalışır. Sık (tek tek harf) yazımlarda `debounce` olmasa da, benzer state'ler ezilir (squash) — örneğin zaman damgasına göre veya metin uzunluğu çok az değiştiyse bir önceki state güncellenir.
- Diff tetikleme: Geri/İleri alma işleminden hemen sonra `compare()` çağrılır.

### Toolbar Buttons
- Sadece klavye kısayolu (Ctrl+Z / Ctrl+Y veya Ctrl+Shift+Z). Şimdilik buton eklenmeyecek (minimum UI footprint).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app.js` içerisindeki `document.addEventListener("keydown", ...)` (Esc için var, buraya eklenecek)
- `originalInput` ve `modifiedInput` DOM referansları
- `compare()` metodu (geri/ileri alınca tetiklenecek)
- `clearButton`, `sampleButton`, `swapButton` handler'ları (içlerinde resetHistory() gibi bir şey çağrılacak)

### Established Patterns
- Modül scope değişkenler (`let currentRows = [];`)
- Saf Vanilla JS (class veya fonksiyon tabanlı state)

### Integration Points
- `app.js` başına veya sonuna History Engine kodları (class veya düz değişken + fonksiyonlar) eklenecek.
- `[originalInput, modifiedInput].forEach((input) => input.addEventListener("input", ...))` listener'ına History kayıt hook'u eklenecek.

</code_context>

<specifics>
## Specific Ideas

- Bir `HistoryStack` veya düz iki array (undoStack, redoStack) mantığı kullanılacak. Her kayıtta `{ original: "...", modified: "...", timestamp: 12345 }` tutulabilir.
- "Squash" (ezme) mantığı: `Date.now() - top.timestamp < 1000` ise yeni kayıt eklemek yerine üsttekini güncelle.

</specifics>

<deferred>
## Deferred Ideas

- Undo/redo için toolbar butonları (şimdilik sadece klavye).

</deferred>
