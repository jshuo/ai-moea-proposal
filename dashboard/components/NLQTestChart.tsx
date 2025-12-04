"use client";

import React from "react";

export default function NLQTestChart() {
  return (
    <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
      <p className="text-sm font-semibold text-emerald-800">
        ✅ Dynamic import OK – ready for real charts
      </p>
      <p className="mt-1 text-xs text-emerald-700">
        This is a test component rendered via dynamic import.
      </p>
    </div>
  );
}
