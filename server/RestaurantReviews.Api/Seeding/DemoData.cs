using RestaurantReviews.Api.Data;

namespace RestaurantReviews.Api.Seeding;

// The demo accounts, restaurants and reviews created by the reset-db command.
public static class DemoData
{
    public const string Password = "demo-password";

    public record Account(string Key, string Email, string DisplayName, UserRole Role);

    // DaysAgo is when the restaurant was added; reviews are written after that.
    public record RestaurantSeed(
        string Owner,
        string Title,
        string Location,
        string Description,
        string[] Cuisines,
        string? Image,
        int DaysAgo,
        ReviewSeed[] Reviews);

    // EditedDaysAgo, when set, is when the review was last edited.
    public record ReviewSeed(string Reviewer, int Rating, string? Text, int DaysAgo, int? EditedDaysAgo = null);

    public static readonly Account[] Accounts =
    [
        new("olivia", "olivia.owner@example.com", "Olivia", UserRole.Owner),
        new("oscar", "oscar.owner@example.com", "Oscar", UserRole.Owner),
        new("rita", "rita.reviewer@example.com", "Rita", UserRole.Reviewer),
        new("ravi", "ravi.reviewer@example.com", "Ravi", UserRole.Reviewer),
    ];

    // 14 restaurants, so the reviewers' list has two pages. Covers every cuisine, multi-cuisine restaurants,
    // restaurants without images or reviews, equal averages (Athens Grill and Olive & Vine, 4.25) and an
    // average that rounds up (Spice Route, 4.125 shown as 4.13). Trattoria Bella has two pages of reviews.
    public static readonly RestaurantSeed[] Restaurants =
    [
        new("olivia", "Trattoria Bella", "12 Harbour Road, Springfield",
            "Family-run trattoria serving hand-made pasta, wood-fired pizza and classic Italian desserts.",
            ["Italian"], "plates.jpg", 95,
            [
                new("rita", 5, "Best carbonara in town. The pasta is clearly made in-house.", 90),
                new("ravi", 4, "Lovely terrace, but the service was slow on a busy Friday.", 84),
                new("rita", 5, "Came back for the tiramisu. Still excellent.", 76),
                new("ravi", 3, null, 70),
                new("rita", 4, "Great pizza crust, toppings a little sparse.", 62, 58),
                new("ravi", 5, "Perfect for a family dinner. Kids loved the pizza.", 55),
                new("rita", 4, "Friendly staff and generous portions.", 47),
                new("ravi", 5, "The seafood linguine was outstanding.", 39),
                new("rita", 2, "Disappointing this time: cold pasta and a long wait.", 30),
                new("ravi", 4, "Back to their usual standard. Good wine list.", 21),
                new("rita", 5, "Truffle ravioli special was worth every penny.", 12),
                new("ravi", 4, "Reliable as always.", 3),
            ]),
        new("olivia", "Le Petit Bistro", "8 Rue Lepic, Springfield",
            "A classic French bistro with a seasonal menu and a short, well-chosen wine list.",
            ["French"], "plates-warm.jpg", 88,
            [
                new("ravi", 3, "Good onion soup, but the steak frites were average.", 80),
                new("rita", 3, "Charming room, a bit pricey for what you get.", 61),
                new("ravi", 4, "The crème brûlée is the reason to come.", 33),
                new("rita", 2, "Service felt rushed and the duck was overcooked.", 9),
            ]),
        new("olivia", "Sakura Sushi", "21 Cherry Lane, Springfield",
            "Fresh sushi, sashimi and ramen, made to order at the counter.",
            ["Japanese"], null, 81,
            [
                new("rita", 5, "Freshest sushi I've had outside Japan.", 74),
                new("ravi", 5, "Excellent tonkotsu ramen with a rich broth.", 40),
                new("rita", 4, "Busy at weekends, so book ahead.", 6),
            ]),
        new("olivia", "Fusion Kitchen", "5 Market Square, Springfield",
            "Italian classics with a Japanese twist, from miso carbonara to matcha tiramisu.",
            ["Italian", "Japanese"], null, 66,
            [
                new("ravi", 2, "Too experimental for me. The miso carbonara didn't work.", 50),
            ]),
        new("olivia", "Spice Route", "17 Station Road, Springfield",
            "North Indian curries, tandoori grills and freshly baked naan.",
            ["Indian"], null, 72,
            [
                new("rita", 5, "The butter chicken is the best I've had.", 68),
                new("ravi", 5, "Perfectly spiced lamb rogan josh.", 60),
                new("rita", 5, "Garlic naan straight from the tandoor. Wonderful.", 49),
                new("ravi", 4, "Great food, small dining room.", 41),
                new("rita", 4, "Good vegetarian options.", 35),
                new("ravi", 4, null, 22),
                new("rita", 3, "Too spicy for my taste, even the mild dishes.", 15),
                new("ravi", 3, "Takeaway arrived lukewarm.", 4),
            ]),
        new("olivia", "Golden Lotus", "3 Garden Walk, Springfield",
            "Dim sum, sushi rolls and noodle bowls in a quiet garden setting.",
            ["Chinese", "Japanese"], null, 14,
            []),
        new("olivia", "Pizza Uno", "40 High Street, Springfield",
            "Neapolitan pizza from a wood-fired oven. Opened this week.",
            ["Italian"], "bruschetta-close-up.webp", 2,
            []),
        new("oscar", "Athens Grill", "3 Olive Street, Springfield",
            "Gyros, souvlaki and grilled halloumi, cooked over charcoal.",
            ["Greek"], "plates-evening.webp", 92,
            [
                new("ravi", 4, "Generous gyros and great tzatziki.", 86),
                new("rita", 5, "The charcoal-grilled octopus is a must.", 63),
                new("ravi", 4, "Good value lunch menu.", 37),
                new("rita", 4, null, 11),
            ]),
        new("oscar", "Taco Fiesta", "Harbour Market, stall 4",
            "Street tacos, fresh salsas and agua fresca from a market stall.",
            ["Mexican"], "plates-mirrored.jpg", 77,
            [
                new("rita", 4, "Great street tacos. Try the al pastor.", 52),
                new("ravi", 3, "Tasty, but small portions for the price.", 18),
            ]),
        new("oscar", "Golden Dragon", "88 Lantern Way, Springfield",
            "Cantonese favourites and dim sum, served late.",
            ["Chinese"], null, 85,
            [
                new("rita", 1, "Cold food and a long wait.", 79),
                new("ravi", 2, "The dumplings were fine, everything else was greasy.", 27, 25),
            ]),
        new("oscar", "Olive & Vine", "22 Vineyard Lane, Springfield",
            "Mediterranean small plates from Greece, Italy and the south of France.",
            ["Greek", "Italian", "French"], "salad-close-up.webp", 70,
            [
                new("ravi", 4, "Lovely sharing plates and a great Greek salad.", 64),
                new("rita", 5, "Fantastic burrata and friendly service.", 45),
                new("ravi", 4, "Good wine selection.", 28),
                new("rita", 4, null, 8),
            ]),
        new("oscar", "Masala & Wok", "9 Canal Street, Springfield",
            "Indo-Chinese street food: chilli paneer, hakka noodles and Manchurian.",
            ["Indian", "Chinese"], null, 58,
            [
                new("rita", 3, "Interesting mix, the chilli paneer was the highlight.", 53),
                new("ravi", 4, "Hakka noodles were excellent.", 31),
                new("rita", 3, "A bit oily.", 7),
            ]),
        new("oscar", "Café Provence", "14 Lavender Row, Springfield",
            "Provençal home cooking with fresh bread and pastries baked every morning.",
            ["French"], null, 63,
            [
                new("ravi", 4, "Wonderful croissants and strong coffee.", 57),
                new("rita", 4, "The ratatouille tasted like summer.", 34),
                new("ravi", 5, "Best bouillabaisse I've had.", 16),
            ]),
        new("oscar", "El Mercado", "Harbour Market, stall 9",
            "Burritos, quesadillas and churros. Opened last week.",
            ["Mexican"], null, 6,
            []),
    ];
}
