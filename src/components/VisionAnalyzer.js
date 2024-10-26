import React, { useState, useRef } from "react";
import {
  Upload,
  Camera,
  Loader2,
  RefreshCw,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";

const VisionBookSearch = ({ onBookFound }) => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchStep, setSearchStep] = useState("upload");
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setError("Veľkosť obrázka by mala byť menšia ako 4MB");
        return;
      }
      setImage(file);
      setSearchResults(null);
      setError(null);
      setSearchStep("upload");
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const searchBooks = async () => {
    if (!image) return;

    setIsLoading(true);
    setError(null);
    setSearchStep("analyzing");

    const formData = new FormData();
    formData.append("image", image);

    try {
      const visionResponse = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
      });

      if (!visionResponse.ok) {
        throw new Error("Nepodarilo sa analyzovať obrázok");
      }

      const visionData = await visionResponse.json();

      const detectedText = visionData.textAnnotations?.[0]?.description || "";
      if (!detectedText) {
        throw new Error("V obrázku nebol detegovaný žiadny text");
      }

      setSearchStep("searching");

      const searchResponse = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
          detectedText
        )}&maxResults=5`
      );

      if (!searchResponse.ok) {
        throw new Error("Nepodarilo sa vyhľadať knihy");
      }

      const searchData = await searchResponse.json();

      if (!searchData.items?.length) {
        throw new Error("Nenašli sa žiadne knihy zodpovedajúce obrázku");
      }

      const transformedResults = searchData.items.map((item) => ({
        id: item.id,
        title: item.volumeInfo.title,
        authors: item.volumeInfo.authors?.join(", ") || "Neznámy",
        publisher: item.volumeInfo.publisher || "Neznámy",
        publishedDate:
          item.volumeInfo.publishedDate?.substring(0, 4) || "Neznámy",
        isbn: item.volumeInfo.industryIdentifiers?.[0]?.identifier || "Neznámy",
        thumbnail: item.volumeInfo.imageLinks?.thumbnail || null,
        confidence: calculateConfidence(detectedText, item.volumeInfo.title),
      }));

      setSearchResults(transformedResults);
      setSearchStep("complete");
    } catch (err) {
      setError(err.message);
      setSearchStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateConfidence = (detectedText, bookTitle) => {
    const normalized1 = detectedText.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalized2 = bookTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
    const longerLength = Math.max(normalized1.length, normalized2.length);
    let matchCount = 0;

    for (let i = 0; i < longerLength; i++) {
      if (normalized1[i] === normalized2[i]) matchCount++;
    }

    return Math.round((matchCount / longerLength) * 100);
  };

  const resetSearch = () => {
    setImage(null);
    setPreview(null);
    setSearchResults(null);
    setError(null);
    setSearchStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="max-w-md mx-auto bg-white">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg">Vyhľadať podľa obalu</span>
          {(image || searchResults) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={resetSearch}
              className="hover:bg-gray-100"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          )}
        </CardTitle>
        <p className="text-sm text-gray-500">
          Odfotografujte obal knihy alebo jej chrbát
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {!preview && (
          <div className="flex flex-col gap-4">
            <div className="relative h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                ref={fileInputRef}
              />
              <div className="text-center">
                <Camera className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Kliknite pre fotografovanie
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full py-6"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-5 w-5" />
              Nahrať obrázok
            </Button>
          </div>
        )}

        {preview && (
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <img
                src={preview}
                alt="Náhľad"
                className="w-full h-full object-contain"
              />
            </div>

            {!searchResults && !error && (
              <Button
                className="w-full"
                onClick={searchBooks}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {searchStep === "analyzing"
                      ? "Analyzujem obrázok..."
                      : "Vyhľadávam knihy..."}
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-5 w-5" />
                    Vyhľadať knihy
                  </>
                )}
              </Button>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {searchResults && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Nájdené knihy:</h3>
                  <Badge variant="secondary">
                    {searchResults.length} výsledkov
                  </Badge>
                </div>

                <div className="space-y-3">
                  {searchResults.map((book) => (
                    <div
                      key={book.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => onBookFound?.(book)}
                    >
                      {book.thumbnail ? (
                        <img
                          src={book.thumbnail}
                          alt={book.title}
                          className="w-16 h-24 object-cover rounded-sm"
                        />
                      ) : (
                        <div className="w-16 h-24 bg-gray-200 rounded-sm flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {book.title}
                        </h4>
                        <p className="text-sm text-gray-500 truncate">
                          {book.authors}
                        </p>
                        <p className="text-xs text-gray-400">
                          {book.publisher} • {book.publishedDate}
                        </p>
                        <Badge variant="outline" className="mt-2">
                          Zhoda: {book.confidence}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VisionBookSearch;
