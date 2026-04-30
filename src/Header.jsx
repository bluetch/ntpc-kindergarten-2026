import React from "react";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="回清單首頁">
        <span className="brand-mark">幼</span>
        <span>
          <strong>中永和幼兒園抽籤小幫手</strong>
          <small>給忙碌新手爸媽的暖暖整理包</small>
        </span>
      </Link>
      <nav>
        <Link to="/">清單</Link>
        <Link to="/sources">資料來源</Link>
        <a className="secondary-action" href="https://kid123.ntpc.edu.tw/" target="_blank" rel="noreferrer">
          官方招生網站
        </a>
        <a href="https://github.com/bluetch/ntpc-kindergarten-2026" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  );
}
