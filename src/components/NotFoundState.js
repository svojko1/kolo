import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { AlertCircle } from "lucide-react";
import { Badge } from "./ui/badge";

const NotFoundState = ({ isbn }) => {
  return (
    <Card className="mt-4 bg-gray-50 border-gray-200 transition-colors duration-200">
      <CardHeader className="bg-gray-100/50">
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className="bg-gray-100 text-gray-800 hover:bg-gray-100/80 border-gray-200 text-lg px-6 py-2"
          >
            Nenájdené
          </Badge>
          <span className="text-sm text-gray-600 opacity-70">ISBN: {isbn}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center justify-center py-6 text-gray-500">
          <AlertCircle className="h-12 w-12 mb-4 text-gray-400" />
          <p className="text-lg font-medium">Ľutujeme, kniha nebola nájdená</p>
          <p className="text-sm mt-2">
            Pre zadané ISBN {isbn} sa nenašli žiadne informácie
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotFoundState;
