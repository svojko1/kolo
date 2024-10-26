import React, { useState, useRef, useEffect } from "react";
import { Camera, Loader2, BookOpen, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "./components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

// Mock data service - can be replaced with real API later
const mockBookData = {
  9780141439518: {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    publicationYear: 2002,
    genre: "Classic Literature",
  },
  9780747532743: {
    title: "Harry Potter and the Philosopher's Stone",
    author: "J.K. Rowling",
    publicationYear: 1997,
    genre: "Fantasy",
  },
};

// Evaluation rules
const rules = {
  maxAge: 20,
  keepGenres: ["Classic Literature", "Academic", "Reference"],
};

const LibraryScanner = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const [isbn, setIsbn] = useState("");
  const [scanning, setScanning] = useState(false);
  const [bookData, setBookData] = useState(null);
  const [decision, setDecision] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      // Show user-friendly error message
      setDecision({
        keep: false,
        reason: "Camera access failed. Please use manual input.",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      setCameraActive(false);
      setScanning(false);
    }
  };

  const evaluateBook = (book) => {
    const currentYear = new Date().getFullYear();
    const age = currentYear - book.publicationYear;
    const isKeepGenre = rules.keepGenres.includes(book.genre);

    return {
      keep: isKeepGenre || age <= rules.maxAge,
      reason: isKeepGenre
        ? `Genre (${book.genre}) is in keep list`
        : age <= rules.maxAge
        ? "Book is within age threshold"
        : `Book is ${age} years old (threshold: ${rules.maxAge} years)`,
    };
  };

  const handleManualSubmit = () => {
    setScanning(true);
    // Simulate API call delay
    setTimeout(() => {
      const book = mockBookData[isbn];
      if (book) {
        setBookData(book);
        setDecision(evaluateBook(book));
      } else {
        setDecision({
          keep: false,
          reason: "Book not found in database",
        });
      }
      setScanning(false);
    }, 1000);
  };

  const resetScan = () => {
    setIsbn("");
    setBookData(null);
    setDecision(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Library Book Scanner</CardTitle>
          <CardDescription>
            Scan ISBN or enter manually to evaluate books
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!bookData && (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter ISBN..."
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleManualSubmit}
                  disabled={!isbn || scanning}
                >
                  {scanning ? <Loader2 className="animate-spin" /> : "Check"}
                </Button>
              </div>

              <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button onClick={startCamera}>
                      <Camera className="mr-2 h-4 w-4" />
                      Start Camera
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {bookData && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <h3 className="font-medium">Title</h3>
                  <p>{bookData.title}</p>
                </div>
                <div>
                  <h3 className="font-medium">Author</h3>
                  <p>{bookData.author}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium">Year</h3>
                    <p>{bookData.publicationYear}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Genre</h3>
                    <p>{bookData.genre}</p>
                  </div>
                </div>
              </div>

              {decision && (
                <Alert variant={decision.keep ? "default" : "destructive"}>
                  <BookOpen className="h-4 w-4" />
                  <AlertTitle>
                    {decision.keep ? "Keep Book" : "Consider Recycling"}
                  </AlertTitle>
                  <AlertDescription>{decision.reason}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between">
          {bookData && (
            <Button variant="outline" onClick={resetScan}>
              <X className="mr-2 h-4 w-4" />
              New Scan
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default LibraryScanner;
