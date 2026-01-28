"use client";

import dynamic from "next/dynamic";

const SgdsMasthead = dynamic(
  () => import("@govtechsg/sgds-web-component/react/masthead/index.js"),
  { ssr: false }
);

export function SGDSMasthead() {
  return <SgdsMasthead />;
}
