using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.Infrastructure;

namespace RestaurantReviews.Api.Auth;

// Rejects requests that change data unless their X-XSRF-TOKEN header matches the antiforgery cookie.
// MVC's AutoValidateAntiforgeryTokenAttribute does the same but needs view services this API doesn't register.
public class AntiforgeryValidationFilter(IAntiforgery antiforgery, ProblemDetailsFactory problemDetailsFactory)
    : IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var method = context.HttpContext.Request.Method;
        if (HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method) || HttpMethods.IsTrace(method))
        {
            return;
        }

        if (!await antiforgery.IsRequestValidAsync(context.HttpContext))
        {
            var problem = problemDetailsFactory.CreateProblemDetails(
                context.HttpContext,
                StatusCodes.Status400BadRequest,
                title: "Your session token is missing or out of date. Refresh the page and try again.");
            context.Result = new ObjectResult(problem) { StatusCode = problem.Status };
        }
    }
}
