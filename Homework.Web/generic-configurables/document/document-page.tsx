import "server-only";

import { readFile } from "node:fs/promises";
import { createElement, type ReactNode } from "react";
import { ApplicationHeader } from "../application/application-header";
import { ApplicationScrollArea, ApplicationScrollContent, ApplicationScrollViewport } from "../application/application-scroll-area";
import type { DocumentPageProps } from "./types";
import layout from "../application/application.module.css";
import styles from "./document.module.css";

function inlineContent(text: string) {
  return text.split(/(`[^`]+`|https?:\/\/[^\s<>]+[^\s<>.,;:!?])/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (/^https?:\/\//.test(part)) return <a key={index} href={part}>{part}</a>;
    return part;
  });
}

function documentContent(lines: string[]): ReactNode[] {
  const blocks: ReactNode[] = [];

  for (let index = 0; index < lines.length;) {
    const start = index;
    const line = lines[index];
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const list = line.match(/^(\s*)[-*+]\s+(.+)$/);

    if (!line.trim()) {
      index++;
    } else if (heading) {
      blocks.push(createElement(`h${Math.min(heading[1].length + 1, 6)}`, { key: start }, inlineContent(heading[2])));
      index++;
    } else if (list) {
      const items: ReactNode[] = [];
      const indentation = list[1].length;

      while (index < lines.length) {
        const item = lines[index].match(/^(\s*)[-*+]\s+(.+)$/);
        if (!item || item[1].length !== indentation) break;
        const itemStart = index++;
        const nested: string[] = [];

        while (index < lines.length && lines[index].trim() && lines[index].search(/\S/) > indentation) {
          nested.push(lines[index++]);
        }

        items.push(<li key={itemStart}><span className={styles.number} aria-hidden="true" /><p>{inlineContent(item[2])}</p>{documentContent(nested)}</li>);
      }

      blocks.push(<ol key={start} role="list" className={styles.paragraphs}>{items}</ol>);
    } else {
      const paragraph = [lines[index++].trim()];
      while (index < lines.length && lines[index].trim() && !/^\s*(?:#{1,6}|[-*+])\s/.test(lines[index])) paragraph.push(lines[index++].trim());
      blocks.push(<p key={start}>{inlineContent(paragraph.join(" "))}</p>);
    }
  }

  return blocks;
}

export async function DocumentPage({ name, navigation, title, source }: DocumentPageProps) {
  const content = await readFile(source, "utf8");
  const sections = content.replaceAll("\r\n", "\n").trim().split(/^#\s+/m).filter(Boolean);

  return (
    <ApplicationScrollArea>
      <ApplicationHeader name={name} navigation={navigation} contentId="document-content" />
      <main id="document-content" tabIndex={-1} aria-labelledby="document-title" className={layout.main}>
        <h1 id="document-title" className={layout.heading}>{title}</h1>
        <ApplicationScrollViewport className={layout.content} role="region" aria-label={title} tabIndex={0}>
          <ApplicationScrollContent render={<ol />} className={styles.sections} role="list" aria-label={title}>
            {sections.map((section, index) => {
              const [heading, ...lines] = section.split("\n");
              const sectionTitle = <><span className={styles.number} aria-hidden="true" />{" "}{inlineContent(heading.replace(/^\d+\.\s+/, ""))}</>;

              return <li key={index}><h2>{sectionTitle}</h2>{documentContent(lines)}</li>;
            })}
          </ApplicationScrollContent>
        </ApplicationScrollViewport>
      </main>
    </ApplicationScrollArea>
  );
}
