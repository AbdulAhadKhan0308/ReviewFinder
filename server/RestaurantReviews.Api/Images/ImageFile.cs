using System.Diagnostics.CodeAnalysis;

namespace RestaurantReviews.Api.Images;

// An uploaded image whose bytes have been checked to be a JPG, PNG or WebP file of an allowed size.
public sealed class ImageFile
{
    public const int MaxBytes = 5 * 1024 * 1024;

    // Base64 uses 4 characters for every 3 bytes.
    private const int MaxBase64Length = (MaxBytes + 2) / 3 * 4;
    private const string TooLarge = "Image must be 5 MB or smaller.";

    private static ReadOnlySpan<byte> JpegSignature => [0xFF, 0xD8, 0xFF];
    private static ReadOnlySpan<byte> PngSignature => [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    private ImageFile(byte[] bytes, string contentType)
    {
        Bytes = bytes;
        ContentType = contentType;
    }

    public byte[] Bytes { get; }

    public string ContentType { get; }

    public static bool TryDecode(
        string base64,
        [NotNullWhen(true)] out ImageFile? image,
        [NotNullWhen(false)] out string? error)
    {
        image = null;
        error = null;
        if (base64.Length > MaxBase64Length)
        {
            error = TooLarge;
            return false;
        }

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(base64);
        }
        catch (FormatException)
        {
            error = "The image couldn't be read. Choose the file again.";
            return false;
        }

        if (bytes.Length > MaxBytes)
        {
            error = TooLarge;
            return false;
        }

        var contentType = DetectContentType(bytes);
        if (contentType is null)
        {
            error = "Image must be a JPG, PNG or WebP file.";
            return false;
        }

        image = new ImageFile(bytes, contentType);
        return true;
    }

    // Uses the file's first bytes rather than its name, so a renamed file of another type is rejected.
    private static string? DetectContentType(ReadOnlySpan<byte> bytes)
    {
        if (bytes.StartsWith(JpegSignature))
        {
            return "image/jpeg";
        }

        if (bytes.StartsWith(PngSignature))
        {
            return "image/png";
        }

        if (bytes.Length >= 12 && bytes.StartsWith("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8))
        {
            return "image/webp";
        }

        return null;
    }
}
