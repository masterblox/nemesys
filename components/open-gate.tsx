"use client";

export function OpenGate() {
  function open() {
    if (document.querySelector(".atlantys-home")) {
      window.dispatchEvent(new Event("atlantys:open-gate"));
      return;
    }
    window.location.assign("/?gate=1");
  }

  return (
    <button
      className="open-gate"
      type="button"
      onClick={open}
    >
      Open gate
    </button>
  );
}
