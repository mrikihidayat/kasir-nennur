"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Daftarkan service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("SW register gagal:", err));
    }

    // Tangkap event install dari browser
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      showInstallAlert(e);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Cek kalau app sudah pernah diinstall / sedang jalan sebagai PWA
    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const showInstallAlert = async (promptEvent) => {
    const result = await Swal.fire({
      title: "Install Kasir Lauk?",
      text: "Pasang aplikasi ini di HP kamu biar bisa dibuka langsung dari layar utama, tanpa buka browser.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Install",
      cancelButtonText: "Nanti dulu",
      confirmButtonColor: "#7e22ce",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  return null;
}
