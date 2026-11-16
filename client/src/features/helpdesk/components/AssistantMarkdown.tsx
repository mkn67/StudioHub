import React from "react";
import Markdown from "react-markdown";
import { safeHelpdeskHref } from "../types/helpdesk.types";

export function AssistantMarkdown({ text }: { text: string }) {
  return <Markdown skipHtml allowedElements={["p", "strong", "em", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "br", "code"]}
    urlTransform={url => safeHelpdeskHref(url) ?? ""}
    components={{ a: ({ href, children }) => href
      ? <a href={href} target={href.startsWith("https:") ? "_blank" : undefined} rel="noopener noreferrer">{children}</a>
      : <span>{children}</span> }}>{text}</Markdown>;
}
