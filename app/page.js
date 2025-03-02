"use client";
import { useEffect, useRef, useState } from "react";
import * as handpose from "@tensorflow-models/handpose";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

export default function Home() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [model, setModel] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    async function loadModel() {
      await tf.setBackend("webgl");
      const net = await handpose.load();
      setModel(net);
      console.log("✅ Handpose model loaded.");
    }

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoRef.current.srcObject = stream;
        console.log("✅ Camera is set up.");
      } catch (error) {
        console.error("❌ Error accessing camera:", error);
      }
    }

    setupCamera();
    loadModel();
  }, []);

  useEffect(() => {
    if (model && videoRef.current) {
      detectGesture();
    }
  }, [model]);

  async function detectGesture() {
    if (!model || !videoRef.current) {
      console.log("⏳ Waiting for model and video...");
      return;
    }

    if (!isDetecting) {
      console.log("▶️ Starting hand detection...");
      setIsDetecting(true);
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const predictions = await model.estimateHands(video);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (predictions.length > 0) {
      console.log("🖐 Hand detected:", predictions);

      predictions.forEach((hand) => {
        drawHand(hand.landmarks, ctx);

        const fingersUp = hand.landmarks.slice(5, 21).map((pt) => pt[1]);
        const isPeaceSign =
          fingersUp[0] > fingersUp[1] && fingersUp[2] < fingersUp[3];

        console.log("✌️ Peace Sign Detected:", isPeaceSign);

        if (isPeaceSign) {
          takePhoto();
        }
      });
    } else {
      console.log("❌ No hands detected.");
    }

    requestAnimationFrame(detectGesture);
  }

  function drawHand(landmarks, ctx) {
    ctx.fillStyle = "red";
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;

    landmarks.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });

    const fingers = [
      [0, 1, 2, 3, 4],
      [0, 5, 6, 7, 8],
      [0, 9, 10, 11, 12],
      [0, 13, 14, 15, 16],
      [0, 17, 18, 19, 20],
    ];

    fingers.forEach((finger) => {
      ctx.beginPath();
      for (let i = 0; i < finger.length - 1; i++) {
        const [x1, y1] = landmarks[finger[i]];
        const [x2, y2] = landmarks[finger[i + 1]];
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    });
  }

  function takePhoto() {
    console.log("📸 Taking photo...");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL("image/png");
    setPhoto(dataURL);
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-4"> 📸Photobooth </h1>{" "}
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-96 h-72 rounded-lg shadow-lg"
          onLoadedData={detectGesture}
        />{" "}
        <canvas ref={canvasRef} className="absolute top-0 left-0 w-96 h-72" />
      </div>{" "}
      {photo && (
        <div className="mt-4">
          <img
            src={photo}
            alt="Captured"
            className="w-96 h-auto rounded-lg shadow-lg"
          />
          <a
            href={photo}
            download="photo.png"
            className="mt-2 inline-block bg-blue-500 px-4 py-2 rounded-md text-white"
          >
            Download Foto{" "}
          </a>{" "}
        </div>
      )}{" "}
    </div>
  );
}
