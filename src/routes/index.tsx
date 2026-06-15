import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => { throw redirect({ to: "/auth" }); },
  head: () => ({
    meta: [
      { title: "Compass | AI Career Guidance for Students" },
      { name: "description", content: "Evidence-led assessments and explainable AI career guidance for secondary school students." },
      { property: "og:title", content: "Compass Career Guidance" },
      { property: "og:description", content: "Discover fitting careers, university routes, and practical next steps." },
    ],
  }),
  component: Index,
});

function Index() {
  return null;
}
