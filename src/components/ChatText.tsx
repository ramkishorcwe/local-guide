// Render the small amount of formatting Guide uses as React text, never raw HTML.
export default function ChatText({ text }: { text: string }) {
  const inline = (line: string) => line.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong> : part);
  return <div className="space-y-2 whitespace-normal">{text.split('\n').filter(line => line.trim()).map((line, index) => {
    const item = line.match(/^\s*(\d+[.)]|[-*])\s+(.+)$/);
    return item ? <div key={index} className="flex gap-2"><span className="shrink-0 text-gold">{item[1] === '-' || item[1] === '*' ? '•' : item[1]}</span><span>{inline(item[2])}</span></div>
      : <p key={index}>{inline(line.replace(/^#{1,3}\s+/, ''))}</p>;
  })}</div>;
}
