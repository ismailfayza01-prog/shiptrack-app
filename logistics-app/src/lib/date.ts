export const formatDate = (value: string | Date | null) => {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (value: string | Date | null) => {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
