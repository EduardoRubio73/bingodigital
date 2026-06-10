'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { loadConfig, DEFAULT_CONFIG, type BingoConfig } from '@/lib/config'

export default function LandingPage() {
  const [cfg, setCfg] = useState<BingoConfig>(DEFAULT_CONFIG)
  useEffect(() => { setCfg(loadConfig()) }, [])

  const whatsappBase = `https://wa.me/${cfg.whatsappNumber}`
  const whatsappMsg = encodeURIComponent(
    `Olá ${cfg.whatsappName}! Quero adquirir meu convite para o Bingo Solidário da Caravana da Saúde ${cfg.eventYear}!`
  )
  const whatsappHref = `${whatsappBase}?text=${whatsappMsg}`

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap');

        :root {
          --maroon: #7B1D1D;
          --golden: #E8A020;
          --orange: #E87020;
          --purple: #8B2FC9;
          --green:  #5BB12F;
          --red:    #D93030;
          --blue:   #2070D8;
          --cream:  #FDF6EC;
          --dark:   #1A0A0A;
        }

        .lp * { box-sizing: border-box; margin: 0; padding: 0; }
        .lp { font-family: 'Nunito', sans-serif; background: var(--cream); color: var(--dark); overflow-x: hidden; }

        /* HERO */
        .lp-hero-img {
          width: 100%;
          line-height: 0;
          background: var(--maroon);
        }

        /* BALL COLUMNS */
        .lp-balls-left, .lp-balls-right {
          position: absolute;
          top: 0; bottom: 0;
          width: 160px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-evenly;
          padding: 40px 0;
          z-index: 3;
          pointer-events: none;
        }
        .lp-balls-left  { left: 0; }
        .lp-balls-right { right: 0; }

        .lp-bball {
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          color: #fff;
          line-height: 1;
          position: relative;
          flex-shrink: 0;
          box-shadow:
            inset 0 -6px 14px rgba(0,0,0,.35),
            inset 3px 3px 10px rgba(255,255,255,.35),
            0 8px 24px rgba(0,0,0,.5);
        }
        .lp-bball::before {
          content: '';
          position: absolute;
          width: 35%; height: 30%;
          background: radial-gradient(circle, rgba(255,255,255,.65) 0%, transparent 100%);
          top: 12%; left: 18%;
          border-radius: 50%;
          pointer-events: none;
        }
        .lp-bball::after {
          content: '';
          position: absolute;
          width: 100%; height: 32%;
          background: rgba(255,255,255,.12);
          top: 34%;
          pointer-events: none;
        }
        .lp-bball .bl { font-size: .9em; font-weight: 900; text-shadow: 0 2px 4px rgba(0,0,0,.4); z-index:1; }
        .lp-bball .bn { font-size: .55em; opacity: .9; z-index:1; }

        @keyframes lpFloatBall {
          0%   { transform: translateY(0)     rotate(0deg)  scale(1); }
          30%  { transform: translateY(-14px) rotate(5deg)  scale(1.03); }
          70%  { transform: translateY(-8px)  rotate(-4deg) scale(.98); }
          100% { transform: translateY(0)     rotate(0deg)  scale(1); }
        }
        @keyframes lpSpinBall {
          0%   { transform: translateY(0)     rotate(0deg); }
          50%  { transform: translateY(-20px) rotate(180deg); }
          100% { transform: translateY(0)     rotate(360deg); }
        }
        @keyframes lpWobbleBall {
          0%,100% { transform: translateY(0)     scale(1)    rotate(0); }
          25%     { transform: translateY(-16px) scale(1.05) rotate(-6deg); }
          75%     { transform: translateY(-6px)  scale(.97)  rotate(4deg); }
        }
        .anim-float  { animation: lpFloatBall  ease-in-out infinite; }
        .anim-spin   { animation: lpSpinBall   ease-in-out infinite; }
        .anim-wobble { animation: lpWobbleBall ease-in-out infinite; }

        /* ── HERO BANNER (nova) ── */
        .lp-hero-banner {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 820px;
        }

        /* Logos */
        .lp-logos-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 28px;
          margin-bottom: 18px;
          flex-wrap: wrap;
          position: relative;
          z-index: 2;
        }
        .lp-logo-box {
          background: rgba(255,255,255,.95);
          border-radius: 20px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(0,0,0,.4);
        }
        .lp-hero-tag {
          font-weight: 800;
          font-size: 12px;
          letter-spacing: 5px;
          text-transform: uppercase;
          color: var(--golden);
          margin-bottom: 10px;
          position: relative;
          z-index: 2;
          opacity: .85;
        }

        /* Título 3D */
        .lp-bingo-3d {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(100px, 20vw, 190px);
          line-height: .82;
          letter-spacing: 6px;
          color: #FFD14A;
          text-shadow:
            0 2px 0 #E8A020,
            0 4px 0 #C87010,
            0 6px 0 #A85808,
            0 8px 0 #883000,
            0 12px 16px rgba(0,0,0,.65),
            0  0 50px rgba(255,180,0,.55),
            0  0 100px rgba(255,100,0,.25);
          position: relative;
          z-index: 2;
        }
        .lp-solidario-3d {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(62px, 13vw, 122px);
          line-height: .9;
          letter-spacing: 8px;
          color: #fff;
          -webkit-text-stroke: 1.5px rgba(255,200,60,.35);
          text-shadow:
            0 2px 0 rgba(0,0,0,.35),
            0 5px 10px rgba(0,0,0,.55),
            0  0 30px rgba(255,200,60,.2);
          position: relative;
          z-index: 2;
          margin-top: -4px;
        }

        /* Layout interno do hero */
        .lp-banner-layout {
          display: grid;
          grid-template-columns: 120px 1fr 200px;
          gap: 20px;
          align-items: center;
          width: 100%;
          margin-top: 6px;
        }

        /* Pilares impacto */
        .lp-pillars-left, .lp-pillars-right-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          z-index: 2;
        }
        .lp-impact-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: 88px; height: 88px;
          border-radius: 50%;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 10.5px;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #fff;
          box-shadow:
            0 4px 20px rgba(0,0,0,.45),
            inset 0 1px 0 rgba(255,255,255,.25),
            inset 0 -3px 0 rgba(0,0,0,.2);
        }
        .lp-impact-pill .lp-pill-icon { font-size: 24px; line-height: 1; }
        .lp-impact-pill.medicamentos { background: radial-gradient(circle at 38% 32%, rgba(255,255,255,.3) 0%, transparent 50%), #8B2FC9; }
        .lp-impact-pill.acolhimento  { background: radial-gradient(circle at 38% 32%, rgba(255,255,255,.3) 0%, transparent 50%), #E87020; }
        .lp-impact-pill.saude        { background: radial-gradient(circle at 38% 32%, rgba(255,255,255,.3) 0%, transparent 50%), #1E8B3A; }
        .lp-impact-pill.esperanca    { background: radial-gradient(circle at 38% 32%, rgba(255,255,255,.3) 0%, transparent 50%), #D93030; }
        .lp-impact-pill.educacao     { background: radial-gradient(circle at 38% 32%, rgba(255,255,255,.3) 0%, transparent 50%), #2070D8; }

        /* Centro do banner */
        .lp-banner-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          z-index: 2;
        }

        /* Badge circular "Bingo Sem Fronteiras" */
        .lp-badge-ring {
          position: relative;
          width: 130px; height: 130px;
          margin: 10px 0 4px;
        }
        .lp-badge-ring::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: conic-gradient(#FFD700, #FF6B00, #FFD700, #FF6B00, #FFD700);
          animation: lpSpinBall 8s linear infinite;
        }
        .lp-badge-inner {
          position: absolute;
          inset: 6px;
          border-radius: 50%;
          background: radial-gradient(circle at 40% 35%, #3a1050 0%, #1a0530 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          z-index: 1;
          overflow: hidden;
        }
        .lp-badge-inner::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 40% 30%, rgba(255,255,255,.12) 0%, transparent 60%);
          border-radius: 50%;
        }
        .lp-badge-b {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          color: #FFD700;
          letter-spacing: 2px;
          text-shadow: 0 0 12px rgba(255,180,0,.7);
          z-index: 1;
          line-height: 1;
        }
        .lp-badge-balls {
          display: flex;
          gap: 3px;
          z-index: 1;
        }
        .lp-badge-ball {
          width: 14px; height: 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 8px;
          color: #fff;
          font-weight: 900;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.4);
        }
        .lp-badge-subtitle {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 8px;
          letter-spacing: 2px;
          color: rgba(255,255,255,.6);
          text-transform: uppercase;
          z-index: 1;
        }

        /* Coluna direita */
        .lp-banner-right {
          display: flex;
          flex-direction: column;
          gap: 14px;
          z-index: 2;
        }
        .lp-info-box {
          background: rgba(232,160,32,.12);
          border: 1.5px solid rgba(232,160,32,.4);
          border-radius: 14px;
          padding: 14px 16px;
        }
        .lp-info-box-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 13px;
          letter-spacing: 1.5px;
          color: var(--golden);
          line-height: 1.2;
          margin-bottom: 6px;
        }
        .lp-info-box-text {
          font-size: 12px;
          color: rgba(255,255,255,.75);
          line-height: 1.55;
          font-weight: 600;
        }
        .lp-info-box-text strong { color: var(--golden); }

        /* Responsivo banner */
        @media (max-width: 860px) {
          .lp-banner-layout { grid-template-columns: 1fr; }
          .lp-pillars-left, .lp-pillars-right-col { flex-direction: row; justify-content: center; }
          .lp-banner-right { align-items: center; }
          .lp-info-box { max-width: 340px; }
        }

        .lp-hero-subtitle {
          font-size: clamp(15px, 2.5vw, 20px);
          color: rgba(255,255,255,.88);
          text-align: center;
          max-width: 540px;
          line-height: 1.55;
          margin-top: 20px;
          position: relative;
          z-index: 2;
          font-weight: 600;
        }

        /* SHARED */
        .lp-inner { max-width: 960px; margin: 0 auto; }
        .lp-chip {
          display: inline-block;
          background: var(--maroon);
          color: #fff;
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          padding: 6px 18px;
          border-radius: 30px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        .lp-section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(38px, 7vw, 64px);
          color: var(--maroon);
          line-height: 1.05;
          margin-bottom: 24px;
        }

        /* MISSION */
        .lp-mission {
          background: #fff;
          padding: 80px 20px;
          position: relative;
          overflow: hidden;
        }
        .lp-mission::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 6px;
          background: linear-gradient(90deg, var(--red), var(--orange), var(--golden), var(--green), var(--purple));
        }
        .lp-mission-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          align-items: center;
        }
        .lp-mission-text p { font-size: 17px; line-height: 1.75; color: #444; margin-bottom: 16px; }
        .lp-mission-text p strong { color: var(--maroon); }
        .lp-africa-card {
          background: var(--maroon);
          border-radius: 24px;
          padding: 40px 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          box-shadow: 0 16px 48px rgba(123,29,29,.3);
        }
        .lp-africa-card .quote {
          font-size: 15px;
          color: rgba(255,255,255,.85);
          text-align: center;
          font-style: italic;
          line-height: 1.6;
          font-weight: 600;
        }
        .lp-africa-card .quote strong { color: var(--golden); font-style: normal; }

        /* PILLARS */
        .lp-pillars { background: var(--cream); padding: 80px 20px; }
        .lp-pillars-header { text-align: center; max-width: 640px; margin: 0 auto 56px; }
        .lp-pillars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          max-width: 960px;
          margin: 0 auto;
        }
        .lp-pillar-card {
          background: #fff;
          border-radius: 20px;
          padding: 36px 28px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0,0,0,.07);
          border-top: 4px solid var(--golden);
          transition: transform .2s, box-shadow .2s;
        }
        .lp-pillar-card:nth-child(2) { border-top-color: var(--red); }
        .lp-pillar-card:nth-child(3) { border-top-color: var(--green); }
        .lp-pillar-card:hover { transform: translateY(-6px); box-shadow: 0 12px 36px rgba(0,0,0,.12); }
        .lp-pillar-icon {
          width: 64px; height: 64px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px;
          font-size: 28px;
        }
        .lp-pillar-icon.gold  { background: rgba(232,160,32,.15); }
        .lp-pillar-icon.red   { background: rgba(217,48,48,.12); }
        .lp-pillar-icon.green { background: rgba(91,177,47,.12); }
        .lp-pillar-title { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: var(--maroon); margin-bottom: 10px; letter-spacing: 1px; }
        .lp-pillar-desc  { font-size: 15px; line-height: 1.65; color: #666; }

        /* HOW IT WORKS */
        .lp-how {
          background: var(--maroon);
          padding: 80px 20px;
          position: relative;
          overflow: hidden;
        }
        .lp-how::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,.04) 1px, transparent 1px);
          background-size: 30px 30px;
          pointer-events: none;
        }
        .lp-how .lp-section-title { color: #fff; }
        .lp-how .lp-chip { background: rgba(255,255,255,.15); color: var(--golden); }
        .lp-steps {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          max-width: 960px;
          margin: 48px auto 0;
          position: relative;
          z-index: 2;
        }
        .lp-step { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 14px; }
        .lp-step-num {
          width: 56px; height: 56px;
          border-radius: 50%;
          background: var(--golden);
          color: var(--dark);
          font-family: 'Bebas Neue', sans-serif;
          font-size: 28px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(232,160,32,.4);
          flex-shrink: 0;
        }
        .lp-step-text { font-size: 15px; color: rgba(255,255,255,.85); line-height: 1.6; font-weight: 600; }

        /* EVENT INFO */
        .lp-event-info {
          background: #fff;
          padding: 80px 20px;
          position: relative;
          overflow: hidden;
        }
        .lp-event-info::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 5px;
          background: linear-gradient(90deg, var(--golden), var(--orange), var(--red));
        }
        .lp-event-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: start;
        }
        .lp-event-date-block {
          background: var(--maroon);
          border-radius: 24px;
          padding: 40px 36px;
          color: #fff;
          display: flex;
          flex-direction: column;
          gap: 24px;
          box-shadow: 0 16px 48px rgba(123,29,29,.25);
        }
        .lp-date-big   { font-family: 'Bebas Neue', sans-serif; font-size: 72px; color: var(--golden); line-height: 1; letter-spacing: 2px; }
        .lp-date-month { font-family: 'Bebas Neue', sans-serif; font-size: 32px; color: rgba(255,255,255,.9); letter-spacing: 4px; text-transform: uppercase; margin-top: -8px; }
        .lp-date-year  { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: rgba(255,255,255,.5); letter-spacing: 4px; }
        .lp-event-row  { display: flex; align-items: flex-start; gap: 14px; }
        .lp-event-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(232,160,32,.2); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .lp-event-row-text { font-size: 15px; line-height: 1.55; color: rgba(255,255,255,.85); font-weight: 600; }
        .lp-event-row-text strong { color: var(--golden); display: block; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 2px; }
        .lp-event-extra { display: flex; flex-direction: column; gap: 20px; }
        .lp-event-card {
          background: var(--cream);
          border-radius: 18px;
          padding: 24px 26px;
          display: flex;
          align-items: center;
          gap: 18px;
          border-left: 4px solid var(--golden);
        }
        .lp-event-card.youtube { border-left-color: var(--red); }
        .lp-event-card.whats   { border-left-color: var(--green); }
        .lp-event-card-icon { font-size: 32px; flex-shrink: 0; }
        .lp-event-card-text h4 { font-size: 15px; font-weight: 800; color: var(--maroon); margin-bottom: 4px; }
        .lp-event-card-text p  { font-size: 14px; color: #666; line-height: 1.5; }
        .lp-event-card-text a  { color: var(--maroon); font-weight: 800; text-decoration: none; }
        .lp-event-card-text a:hover { text-decoration: underline; }
        .lp-whats-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #25D366;
          color: #fff;
          font-family: 'Nunito', sans-serif;
          font-weight: 900;
          font-size: 16px;
          padding: 14px 32px;
          border-radius: 50px;
          text-decoration: none;
          box-shadow: 0 4px 18px rgba(37,211,102,.4);
          transition: transform .2s, box-shadow .2s;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: .5px;
        }
        .lp-whats-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(37,211,102,.5); }

        /* PRIZES */
        .lp-prizes {
          background: linear-gradient(135deg, var(--maroon) 0%, #5A1010 100%);
          padding: 80px 20px;
          position: relative;
          overflow: hidden;
        }
        .lp-prizes::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(232,160,32,.08) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .lp-prizes .lp-section-title { color: #fff; text-align: center; }
        .lp-prizes .lp-chip { background: rgba(255,255,255,.15); color: var(--golden); }
        .lp-prizes-header { text-align: center; margin-bottom: 52px; position: relative; z-index: 2; }
        .lp-prizes-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          max-width: 960px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }
        .lp-prize-card {
          background: rgba(255,255,255,.07);
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 22px;
          padding: 36px 28px;
          text-align: center;
          backdrop-filter: blur(8px);
          transition: transform .2s, background .2s;
        }
        .lp-prize-card:hover { transform: translateY(-6px); background: rgba(255,255,255,.12); }
        .lp-prize-badge {
          display: inline-block;
          background: var(--golden);
          color: var(--dark);
          font-family: 'Bebas Neue', sans-serif;
          font-size: 14px;
          letter-spacing: 2px;
          padding: 5px 18px;
          border-radius: 30px;
          margin-bottom: 18px;
        }
        .lp-prize-card:nth-child(2) .lp-prize-badge { background: var(--orange); }
        .lp-prize-card:nth-child(3) .lp-prize-badge { background: var(--red); }
        .lp-prize-icon { font-size: 48px; margin-bottom: 14px; }
        .lp-prize-name { font-family: 'Bebas Neue', sans-serif; font-size: 32px; color: #fff; letter-spacing: 2px; margin-bottom: 14px; }
        .lp-prize-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
        .lp-prize-list li { font-size: 14px; color: rgba(255,255,255,.8); font-weight: 600; padding: 8px 12px; background: rgba(255,255,255,.06); border-radius: 8px; }
        .lp-prize-list li::before { content: '🎁 '; }

        /* TICKET */
        .lp-ticket {
          background: linear-gradient(135deg, #fff 0%, #FFF8EE 100%);
          padding: 100px 20px;
          position: relative;
          overflow: hidden;
        }
        .lp-ticket::before {
          content: 'BINGO';
          position: absolute;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 280px;
          color: rgba(123,29,29,.04);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
        }
        .lp-ticket-inner {
          max-width: 680px;
          margin: 0 auto;
          text-align: center;
          position: relative;
          z-index: 2;
        }
        .lp-bingo-card-visual {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
          max-width: 340px;
          margin: 0 auto 40px;
        }
        .lp-bingo-header-cell {
          background: var(--maroon);
          color: var(--golden);
          font-family: 'Bebas Neue', sans-serif;
          font-size: 24px;
          padding: 10px 4px;
          border-radius: 8px;
          text-align: center;
          letter-spacing: 1px;
        }
        .lp-bingo-cell {
          background: #fff;
          border: 2px solid rgba(123,29,29,.12);
          border-radius: 8px;
          padding: 10px 4px;
          text-align: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          color: var(--dark);
          box-shadow: 0 2px 6px rgba(0,0,0,.06);
        }
        .lp-bingo-cell.marked { background: var(--golden); border-color: var(--golden); color: #fff; }
        .lp-bingo-cell.free {
          background: var(--maroon);
          border-color: var(--maroon);
          color: #fff;
          font-size: 12px;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .lp-ticket-title { font-family: 'Bebas Neue', sans-serif; font-size: clamp(42px, 8vw, 72px); color: var(--maroon); line-height: 1; margin-bottom: 12px; }
        .lp-price-big { font-family: 'Bebas Neue', sans-serif; font-size: clamp(56px, 12vw, 96px); color: var(--maroon); line-height: 1; letter-spacing: 2px; }
        .lp-price-big sup { font-size: .4em; vertical-align: top; margin-top: .2em; }
        .lp-price-breakdown { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; margin: 8px 0 16px; }
        .lp-price-pill { background: rgba(123,29,29,.08); border: 1px solid rgba(123,29,29,.15); border-radius: 30px; padding: 6px 16px; font-size: 13px; font-weight: 700; color: var(--maroon); }
        .lp-price-pill.highlight { background: var(--maroon); color: #fff; border-color: var(--maroon); }
        .lp-ticket-note { font-size: 15px; color: #666; margin-bottom: 32px; font-weight: 700; background: rgba(232,160,32,.1); border-radius: 12px; padding: 12px 20px; display: inline-block; }
        .lp-cta-group { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 24px; }
        .lp-btn-primary {
          background: var(--maroon);
          color: #fff;
          padding: 18px 48px;
          border-radius: 60px;
          font-family: 'Nunito', sans-serif;
          font-weight: 900;
          font-size: 17px;
          text-decoration: none;
          letter-spacing: .5px;
          text-transform: uppercase;
          box-shadow: 0 8px 28px rgba(123,29,29,.35);
          transition: transform .2s, box-shadow .2s;
          display: inline-block;
        }
        .lp-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 14px 40px rgba(123,29,29,.45); }
        .lp-btn-secondary {
          background: transparent;
          color: var(--maroon);
          padding: 18px 40px;
          border-radius: 60px;
          font-family: 'Nunito', sans-serif;
          font-weight: 800;
          font-size: 17px;
          text-decoration: none;
          border: 2px solid var(--maroon);
          text-transform: uppercase;
          transition: background .2s, color .2s;
          display: inline-block;
        }
        .lp-btn-secondary:hover { background: var(--maroon); color: #fff; }

        /* SPONSORS */
        .lp-sponsors { background: var(--cream); padding: 80px 20px; position: relative; }
        .lp-sponsors::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, var(--purple), var(--blue), var(--green)); }
        .lp-sponsors-intro { max-width: 680px; margin: 0 auto 56px; text-align: center; }
        .lp-sponsors-intro p { font-size: 17px; line-height: 1.7; color: #555; margin-top: 16px; }
        .lp-sponsors-intro strong { color: var(--maroon); }
        .lp-sponsors-where { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; max-width: 680px; margin: 0 auto 48px; }
        .lp-where-card { background: #fff; border-radius: 16px; padding: 20px 24px; display: flex; align-items: center; gap: 14px; box-shadow: 0 4px 16px rgba(0,0,0,.07); border-left: 4px solid var(--golden); }
        .lp-where-card:nth-child(2) { border-left-color: var(--purple); }
        .lp-where-icon { font-size: 28px; flex-shrink: 0; }
        .lp-where-card p { font-size: 14px; font-weight: 700; color: var(--dark); line-height: 1.4; }
        .lp-where-card span { font-size: 12px; color: #888; font-weight: 600; }
        .lp-tiers-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 960px; margin: 0 auto 40px; }
        .lp-tier-card { background: #fff; border-radius: 24px; padding: 0; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,.09); display: flex; flex-direction: column; transition: transform .2s, box-shadow .2s; }
        .lp-tier-card:hover { transform: translateY(-6px); box-shadow: 0 16px 48px rgba(0,0,0,.14); }
        .lp-tier-card.featured { border: 2px solid var(--golden); transform: scale(1.03); }
        .lp-tier-card.featured:hover { transform: scale(1.03) translateY(-6px); }
        .lp-tier-header { padding: 28px 28px 20px; background: var(--maroon); color: #fff; text-align: center; position: relative; }
        .lp-tier-card:nth-child(2) .lp-tier-header { background: linear-gradient(135deg, #5A1080, #8B2FC9); }
        .lp-tier-card:nth-child(3) .lp-tier-header { background: linear-gradient(135deg, #1A5A1A, #2E8B2E); }
        .lp-tier-badge { position: absolute; top: -1px; right: 20px; background: var(--golden); color: var(--dark); font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; padding: 4px 14px; border-radius: 0 0 12px 12px; }
        .lp-tier-name { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 2px; margin-bottom: 8px; }
        .lp-tier-price { font-family: 'Bebas Neue', sans-serif; font-size: 52px; color: var(--golden); line-height: 1; }
        .lp-tier-price sup { font-size: .4em; vertical-align: top; margin-top: .2em; }
        .lp-tier-price small { font-size: .35em; color: rgba(255,255,255,.6); display: block; letter-spacing: 1px; }
        .lp-tier-body { padding: 24px 28px; flex: 1; display: flex; flex-direction: column; gap: 10px; }
        .lp-tier-feature { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; font-weight: 600; color: #444; line-height: 1.4; }
        .lp-tier-feature .tf-icon { color: var(--green); flex-shrink: 0; font-size: 16px; margin-top: 1px; }
        .lp-tier-footer { padding: 0 28px 28px; }
        .lp-tier-btn { display: block; width: 100%; text-align: center; background: var(--maroon); color: #fff; padding: 14px; border-radius: 50px; font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 15px; text-decoration: none; text-transform: uppercase; letter-spacing: .5px; transition: opacity .2s, transform .2s; }
        .lp-tier-card:nth-child(2) .lp-tier-btn { background: #8B2FC9; }
        .lp-tier-card:nth-child(3) .lp-tier-btn { background: #2E8B2E; }
        .lp-tier-btn:hover { opacity: .88; transform: scale(.98); }
        .lp-sponsors-note { text-align: center; max-width: 560px; margin: 0 auto; font-size: 14px; color: #888; line-height: 1.7; font-weight: 600; }
        .lp-sponsors-note strong { color: var(--maroon); }

        /* FOOTER */
        .lp-footer { background: var(--dark); padding: 56px 20px 32px; color: rgba(255,255,255,.65); text-align: center; }
        .lp-footer-logos { display: flex; align-items: center; justify-content: center; gap: 32px; flex-wrap: wrap; margin-bottom: 28px; }
        .lp-footer-logo-box { background: rgba(255,255,255,.08); border-radius: 20px; padding: 14px 18px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.1); }
        .lp-footer-divider { width: 48px; height: 3px; background: var(--golden); margin: 0 auto 20px; border-radius: 2px; }
        .lp-footer-text { font-size: 14px; line-height: 1.7; max-width: 500px; margin: 0 auto 16px; }
        .lp-footer-link { color: var(--golden); text-decoration: none; font-weight: 700; font-size: 15px; }
        .lp-footer-link:hover { text-decoration: underline; }
        .lp-footer-copy { margin-top: 28px; font-size: 12px; color: rgba(255,255,255,.3); letter-spacing: 1px; }
        .lp-org-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 20px; color: rgba(255,255,255,.35); font-size: 13px; text-decoration: none; border: 1px solid rgba(255,255,255,.1); padding: 8px 18px; border-radius: 30px; transition: color .2s, border-color .2s; }
        .lp-org-link:hover { color: rgba(255,255,255,.65); border-color: rgba(255,255,255,.25); }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .lp-hero { padding: 40px 110px 60px; }
          .lp-tiers-grid { grid-template-columns: 1fr; max-width: 420px; }
          .lp-tier-card.featured { transform: none; }
          .lp-tier-card.featured:hover { transform: translateY(-6px); }
        }
        @media (max-width: 768px) {
          .lp-hero { padding: 40px 80px 60px; }
          .lp-mission-grid { grid-template-columns: 1fr; }
          .lp-pillars-grid { grid-template-columns: 1fr; }
          .lp-steps { grid-template-columns: repeat(2, 1fr); gap: 32px; }
          .lp-event-grid { grid-template-columns: 1fr; }
          .lp-prizes-grid { grid-template-columns: 1fr; max-width: 380px; margin: 0 auto; }
          .lp-sponsors-where { grid-template-columns: 1fr; }
          .lp-bingo-card-visual { max-width: 280px; }
          .lp-balls-left, .lp-balls-right { width: 70px; }
        }
        @media (max-width: 560px) {
          .lp-hero { padding: 40px 60px 60px; }
          .lp-steps { grid-template-columns: 1fr; }
          .lp-logos-row { gap: 16px; }
          .lp-balls-left, .lp-balls-right { width: 52px; }
        }
        @media (max-width: 420px) {
          .lp-hero { padding: 40px 20px 60px; }
          .lp-balls-left, .lp-balls-right { display: none; }
        }
      `}</style>

      <div className="lp">

        {/* HERO */}
        <section className="lp-hero-img">
          <Image
            src="/ws_bingo.png"
            alt="Bingo Solidário — Caravana da Saúde 2026"
            width={0}
            height={0}
            sizes="100vw"
            priority
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </section>

        {/* MISSION */}
        <section className="lp-mission">
          <div className="lp-inner">
            <div className="lp-mission-grid">
              <div className="lp-mission-text">
                <span className="lp-chip">Nossa Missão</span>
                <h2 className="lp-section-title">A Caravana da Saúde 2026</h2>
                <p>A <strong>Caravana da Saúde 2026</strong> é uma missão humanitária que levará medicamentos, atendimentos médicos e acolhimento para adultos e crianças em situação de <strong>vulnerabilidade social no Malawi</strong>, África.</p>
                <p>A iniciativa é fruto da parceria entre o <strong>Projeto Fraternidade Sem Fronteiras</strong> e a <strong>Nação Ubuntu</strong> — duas organizações unidas pelo propósito de servir e transformar vidas.</p>
                <p>Cada convite de Bingo adquirido é um passo concreto de <strong>solidariedade que atravessa continentes</strong>. Sua participação faz a diferença.</p>
                <a href="https://projetomalawi.vercel.app/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--maroon)', fontWeight: 800, fontSize: 15, textDecoration: 'none', marginTop: 8 }}>
                  Conheça o Projeto Malawi →
                </a>
              </div>
              <div>
                <div className="lp-africa-card">
                  <Image src="/logo-ubuntu-africa.png" alt="Nação Ubuntu — África" width={180} height={180} style={{ width: 180, height: 'auto', filter: 'drop-shadow(0 8px 20px rgba(0,0,0,.4))' }} />
                  <p className="quote"><strong>&ldquo;Ubuntu&rdquo;</strong> — em língua africana significa:<br /><em>&ldquo;Sou porque nós somos.&rdquo;</em><br />A humanidade de um depende da humanidade de todos.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILLARS */}
        <section className="lp-pillars">
          <div className="lp-pillars-header">
            <span className="lp-chip">Impacto Real</span>
            <h2 className="lp-section-title" style={{ textAlign: 'center' }}>O que sua participação<br />vai levar ao Malawi</h2>
          </div>
          <div className="lp-pillars-grid">
            {[
              { icon: '💊', cls: 'gold',  title: 'Medicamentos',      desc: 'Remédios essenciais para comunidades sem acesso ao sistema de saúde, levados diretamente às mãos de quem mais precisa.' },
              { icon: '🩺', cls: 'red',   title: 'Atendimento Médico', desc: 'Consultas, diagnósticos e cuidados clínicos para adultos e crianças em situação de vulnerabilidade social.' },
              { icon: '🤝', cls: 'green', title: 'Acolhimento',        desc: 'Presença humana, escuta e dignidade. Porque saúde também é cuidado emocional e pertencimento.' },
            ].map(p => (
              <div key={p.title} className="lp-pillar-card">
                <div className={`lp-pillar-icon ${p.cls}`}>{p.icon}</div>
                <h3 className="lp-pillar-title">{p.title}</h3>
                <p className="lp-pillar-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="lp-how">
          <div className="lp-inner" style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
            <span className="lp-chip">Como Participar</span>
            <h2 className="lp-section-title" style={{ margin: '0 auto' }}>Simples assim!</h2>
          </div>
          <div className="lp-steps">
            {[
              { n: '1', text: <>Adquira seu convite por <strong style={{ color: 'var(--golden)' }}>R$ {cfg.ticketPrice},00</strong> — inclui {cfg.cardsPerTicket} cartelas</> },
              { n: '2', text: <>Receba suas <strong style={{ color: 'var(--golden)' }}>{cfg.cardsPerTicket} cartelas</strong> exclusivas de Bingo</> },
              { n: '3', text: <>Compareça ao evento em <strong style={{ color: 'var(--golden)' }}>{cfg.eventDate} {cfg.eventMonth}</strong> ou assista ao vivo pelo YouTube</> },
              { n: '4', text: <>Concorra a prêmios e <strong style={{ color: 'var(--golden)' }}>transforme vidas</strong></> },
            ].map(s => (
              <div key={s.n} className="lp-step">
                <div className="lp-step-num">{s.n}</div>
                <p className="lp-step-text">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* EVENT INFO */}
        <section className="lp-event-info">
          <div className="lp-inner">
            <div className="lp-event-grid">
              <div className="lp-event-date-block">
                <div>
                  <div className="lp-date-big">{cfg.eventDate}</div>
                  <div className="lp-date-month">{cfg.eventMonth}</div>
                  <div className="lp-date-year">{cfg.eventYear}</div>
                </div>
                <div className="lp-event-row">
                  <div className="lp-event-icon">🕖</div>
                  <div className="lp-event-row-text"><strong>Horário</strong>{cfg.eventTime}</div>
                </div>
                <div className="lp-event-row">
                  <div className="lp-event-icon">📍</div>
                  <div className="lp-event-row-text"><strong>Local</strong>{cfg.eventLocation}<br />{cfg.eventLocationDetail}</div>
                </div>
              </div>

              <div className="lp-event-extra">
                <div style={{ marginBottom: 4 }}>
                  <span className="lp-chip">Data &amp; Local</span>
                  <h2 className="lp-section-title" style={{ marginBottom: 8 }}>Onde e quando<br />vai acontecer</h2>
                  <p style={{ fontSize: 16, color: '#555', lineHeight: 1.6, fontWeight: 600 }}>Um evento presencial cheio de alegria e solidariedade, com transmissão ao vivo para quem não puder comparecer!</p>
                </div>
                <div className="lp-event-card youtube">
                  <div className="lp-event-card-icon">▶️</div>
                  <div className="lp-event-card-text">
                    <h4>Transmissão ao Vivo — YouTube</h4>
                    <p>Não vai poder ir presencialmente? Acompanhe o sorteio ao vivo pelo canal do YouTube. Sua cartela vale tanto no presencial quanto online!</p>
                  </div>
                </div>
                <div className="lp-event-card whats">
                  <div className="lp-event-card-icon">📱</div>
                  <div className="lp-event-card-text">
                    <h4>Comprar pelo WhatsApp</h4>
                    <p>Fale com {cfg.whatsappName} e garanta seu convite agora:<br />
                    <a href={whatsappBase} target="_blank" rel="noopener noreferrer"><strong>{cfg.whatsappNumber}</strong></a></p>
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="lp-whats-btn" style={{ marginTop: 12 }}>
                      💬 Falar com {cfg.whatsappName}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRIZES */}
        <section className="lp-prizes">
          <div className="lp-prizes-header">
            <span className="lp-chip">Prêmios</span>
            <h2 className="lp-section-title">Vários Prêmios Incríveis!</h2>
            <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 17, fontWeight: 600, maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>Premiações por linha, grupo e cartela cheia. Quanto mais você marca, mais chances de ganhar!</p>
          </div>
          <div className="lp-prizes-grid">
            {[
              { badge: 'Por Linha',     icon: '🍷', name: 'Linha Completa', items: ['Cesta de Vinho & Queijo', 'Doces Finos Artesanais', 'Brindes Surpresa'] },
              { badge: 'Por Grupo',     icon: '🎁', name: 'Grupo',          items: ['Cesta de Vinho & Queijo', 'Doces Finos Artesanais', 'Brindes Especiais'] },
              { badge: 'Cartela Cheia', icon: '🏆', name: 'Cartela Cheia',  items: ['Prêmio Principal!', 'Cesta Premium de Vinho & Queijo', 'Doces Finos & Brindes Exclusivos'] },
            ].map(p => (
              <div key={p.name} className="lp-prize-card">
                <div className="lp-prize-badge">{p.badge}</div>
                <div className="lp-prize-icon">{p.icon}</div>
                <h3 className="lp-prize-name">{p.name}</h3>
                <ul className="lp-prize-list">
                  {p.items.map(it => <li key={it}>{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* TICKET */}
        <section className="lp-ticket" id="convite">
          <div className="lp-ticket-inner">
            <div className="lp-bingo-card-visual">
              {['B','I','N','G','O'].map(l => <div key={l} className="lp-bingo-header-cell">{l}</div>)}
              {[
                [7,''],  [18,''], [32,''], [46,''], [62,''],
                [3,''],  [22,'marked'], [36,''], [51,'marked'], [68,''],
                [12,''], [25,''], ['FREE','free'], [48,''], [71,''],
                [5,'marked'], [29,''], [40,''], [55,'marked'], [69,''],
                [15,''], [27,'marked'], [44,''], [59,''], [75,'marked'],
              ].map(([val, cls], i) => (
                <div key={i} className={`lp-bingo-cell${cls ? ` ${cls}` : ''}`}>
                  {cls === 'free' ? '★ FREE' : val}
                </div>
              ))}
            </div>

            <h2 className="lp-ticket-title">Garanta seu<br />Convite Agora</h2>

            <div className="lp-price-breakdown">
              <span className="lp-price-pill highlight">Convite Completo</span>
              <span className="lp-price-pill">{cfg.cardsPerTicket} cartelas por R$ {cfg.ticketPrice},00</span>
              <span className="lp-price-pill">Cartela avulsa R$ {cfg.cardPrice},00</span>
            </div>

            <div style={{ margin: '4px 0 12px' }}>
              <span className="lp-price-big"><sup>R$</sup>{cfg.ticketPrice}<sup>,00</sup></span>
            </div>

            <p className="lp-ticket-note">🎴 Cada convite inclui {cfg.cardsPerTicket} cartelas de Bingo + participação no sorteio de prêmios</p>

            <div className="lp-cta-group">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="lp-btn-primary">
                💬 Adquirir pelo WhatsApp
              </a>
              <a href={cfg.projectUrl} target="_blank" rel="noopener noreferrer" className="lp-btn-secondary">
                Saber Mais
              </a>
            </div>

            <p style={{ marginTop: 20, fontSize: 13, color: '#aaa', fontWeight: 600 }}>
              <span style={{ color: '#e222bb' }}>Fale com {cfg.whatsappName} · {cfg.whatsappNumber}</span>
            </p>
          </div>
        </section>

        {/* SPONSORS */}
        <section className="lp-sponsors" id="patrocinadores">
          <div className="lp-inner">
            <div className="lp-sponsors-intro">
              <span className="lp-chip" style={{ background: 'var(--purple)', fontSize: 18 }}>Patrocínio &amp; Divulgação</span>
              <h2 className="lp-section-title" style={{ textAlign: 'center' }}>Sua Marca no Evento!</h2>
              <p>Empresas e pessoas físicas podem <strong>patrocinar o Bingo Solidário</strong> e ter sua marca divulgada durante o evento — com logo e QR Code para contato exibidos no <strong>telão principal</strong> e nas <strong>cartelas de Bingo</strong> de todos os participantes.</p>
            </div>

            <div className="lp-sponsors-where">
              {[
                { icon: '📺', title: 'Telão Principal do Evento', sub: 'Exibição durante toda a noite' },
                { icon: '🎴', title: 'Nas Cartelas de Bingo', sub: 'Distribuídas a todos os participantes' },
              ].map(w => (
                <div key={w.title} className="lp-where-card">
                  <div className="lp-where-icon">{w.icon}</div>
                  <div><p>{w.title}</p><span>{w.sub}</span></div>
                </div>
              ))}
            </div>

            <div className="lp-tiers-grid">
              <div className="lp-tier-card">
                <div className="lp-tier-header">
                  <div className="lp-tier-name">Simples</div>
                  <div className="lp-tier-price"><sup>R$</sup>100<small>por exibição</small></div>
                </div>
                <div className="lp-tier-body">
                  {['Logo no telão principal','QR Code para contato/site da empresa','Até 3 aparições randômicas durante o evento','Exibição nas cartelas de Bingo'].map(f => (
                    <div key={f} className="lp-tier-feature"><span className="tf-icon">✓</span>{f}</div>
                  ))}
                </div>
                <div className="lp-tier-footer">
                  <a href="https://wa.me/5515996016655?text=Ol%C3%A1%20Izabel!%20Quero%20informa%C3%A7%C3%B5es%20sobre%20patroc%C3%ADnio%20Simples%20para%20o%20Bingo%20Solid%C3%A1rio!" target="_blank" rel="noopener noreferrer" className="lp-tier-btn">Quero Patrocinar</a>
                </div>
              </div>

              <div className="lp-tier-card featured">
                <div className="lp-tier-header">
                  <div className="lp-tier-badge">⭐ MAIS POPULAR</div>
                  <div className="lp-tier-name">Destaque</div>
                  <div className="lp-tier-price"><sup>R$</sup>500<small>exibição em destaque</small></div>
                </div>
                <div className="lp-tier-body">
                  {['Logo em destaque no telão — posição privilegiada','QR Code para contato/site da empresa','Exibição estática durante todo o evento','Destaque especial nas cartelas de Bingo','Menção do patrocinador pelo apresentador'].map(f => (
                    <div key={f} className="lp-tier-feature"><span className="tf-icon">✓</span>{f}</div>
                  ))}
                </div>
                <div className="lp-tier-footer">
                  <a href="https://wa.me/5515996016655?text=Ol%C3%A1%20Izabel!%20Quero%20informa%C3%A7%C3%B5es%20sobre%20patroc%C3%ADnio%20Destaque%20para%20o%20Bingo%20Solid%C3%A1rio!" target="_blank" rel="noopener noreferrer" className="lp-tier-btn">Quero Patrocinar</a>
                </div>
              </div>

              <div className="lp-tier-card">
                <div className="lp-tier-header">
                  <div className="lp-tier-name">Personalizado</div>
                  <div className="lp-tier-price" style={{ fontSize: 32, paddingTop: 4 }}>A combinar<small>fale conosco</small></div>
                </div>
                <div className="lp-tier-body">
                  {['Formatos especiais e pacotes customizados','Cotas especiais para múltiplos eventos','Proposta exclusiva para sua marca','Negociação direta com os organizadores'].map(f => (
                    <div key={f} className="lp-tier-feature"><span className="tf-icon">✓</span>{f}</div>
                  ))}
                </div>
                <div className="lp-tier-footer">
                  <a href="https://wa.me/5515996016655?text=Ol%C3%A1%20Izabel!%20Quero%20discutir%20um%20patroc%C3%ADnio%20personalizado%20para%20o%20Bingo%20Solid%C3%A1rio!" target="_blank" rel="noopener noreferrer" className="lp-tier-btn">Falar com Organizador</a>
                </div>
              </div>
            </div>

            <p className="lp-sponsors-note">
              Ao patrocinar o Bingo Solidário, sua marca associa-se a uma causa humanitária de impacto real. Todas as cotas incluem <strong>logo + QR Code</strong> personalizado. Para mais informações fale com <strong>Izabel · (15) 99601-6655</strong>.
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="lp-footer-logos">
            <div className="lp-footer-logo-box">
              <Image src="/semfronteiraslogo.png" alt="Fraternidade Sem Fronteiras" width={100} height={60} style={{ height: 60, width: 'auto', filter: 'brightness(1.1)' }} />
            </div>
            <div className="lp-footer-logo-box">
              <Image src="/logo-ubuntu-africa.png" alt="Nação Ubuntu" width={100} height={60} style={{ height: 60, width: 'auto', filter: 'brightness(1.1)' }} />
            </div>
          </div>
          <div className="lp-footer-divider" />
          <p className="lp-footer-text">Uma iniciativa solidária da <strong style={{ color: '#fff' }}>{cfg.orgName1}</strong> e <strong style={{ color: '#fff' }}>{cfg.orgName2}</strong> em prol da Caravana da Saúde {cfg.eventYear}.</p>
          <a href={cfg.projectUrl} target="_blank" rel="noopener noreferrer" className="lp-footer-link">{cfg.projectUrl.replace('https://', '')} →</a>

          {/* Acesso organizadores */}
          <div style={{ marginTop: 28 }}>
            <Link href="/login" className="lp-org-link">
              🔐 Acesso para organizadores
            </Link>
          </div>

          <p className="lp-footer-copy">{cfg.footerCopy}</p>
        </footer>

      </div>
    </>
  )
}
